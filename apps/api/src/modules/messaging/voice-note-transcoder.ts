import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import ffmpegPath from "ffmpeg-static";

const MAX_VOICE_NOTE_BYTES = 10 * 1024 * 1024;
const TRANSCODE_TIMEOUT_MS = 30_000;

export type ValidatedVoiceNote = {
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  durationSeconds: number | null;
};

function isOggOpus(data: Buffer): boolean {
  return data.length >= 4
    && data.subarray(0, 4).toString("ascii") === "OggS"
    && data.indexOf(Buffer.from("OpusHead")) !== -1;
}

@Injectable()
export class VoiceNoteTranscoder {
  async prepareForWhatsApp(voiceNote: ValidatedVoiceNote): Promise<ValidatedVoiceNote> {
    if (isOggOpus(voiceNote.data)) {
      return { ...voiceNote, mimeType: "audio/ogg; codecs=opus" };
    }
    const binaryPath = ffmpegPath;
    if (!binaryPath) {
      throw new ServiceUnavailableException("Voice-note conversion is unavailable");
    }

    const output = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(
        binaryPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          "pipe:0",
          "-vn",
          "-ac",
          "1",
          "-ar",
          "48000",
          "-c:a",
          "libopus",
          "-b:a",
          "32k",
          "-vbr",
          "on",
          "-application",
          "voip",
          "-f",
          "ogg",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];
      let outputBytes = 0;
      let settled = false;

      const finish = (error?: Error, data?: Buffer) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(data ?? Buffer.alloc(0));
      };
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        finish(new BadRequestException("Voice-note conversion timed out"));
      }, TRANSCODE_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_VOICE_NOTE_BYTES) {
          child.kill("SIGKILL");
          finish(new BadRequestException("Converted voice note exceeds the 10 MB limit"));
          return;
        }
        chunks.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
      child.on("error", () => finish(new ServiceUnavailableException("Voice-note conversion could not start")));
      child.on("close", (code: number | null) => {
        if (settled) return;
        if (code !== 0) {
          const detail = Buffer.concat(errors).toString("utf8").trim().slice(0, 240);
          finish(new BadRequestException(detail ? `Voice note could not be converted: ${detail}` : "Voice note could not be converted"));
          return;
        }
        const data = Buffer.concat(chunks);
        if (!isOggOpus(data)) {
          finish(new BadRequestException("Voice-note conversion produced an invalid audio file"));
          return;
        }
        finish(undefined, data);
      });

      child.stdin.on("error", () => undefined);
      child.stdin.end(voiceNote.data);
    });

    return {
      data: output,
      mimeType: "audio/ogg; codecs=opus",
      sizeBytes: output.length,
      sha256: createHash("sha256").update(output).digest("hex"),
      durationSeconds: voiceNote.durationSeconds,
    };
  }
}
