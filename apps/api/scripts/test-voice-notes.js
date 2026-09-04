const assert = require("node:assert/strict");
const { BadRequestException } = require("@nestjs/common");
const { spawnSync } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");
const { MessagingService, validateVoiceNote } = require("../dist/modules/messaging/messaging.service");
const { VoiceNoteTranscoder } = require("../dist/modules/messaging/voice-note-transcoder");

const validWebm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04]);

function createService() {
  const events = { sent: null, stored: null, attempts: [], analyzed: 0, inbound: null, emitted: [] };
  const dbClient = { query: async () => ({ rows: [] }), release: () => {} };
  const pool = { connect: async () => dbClient };
  const channel = {
    getStatus: () => "connected",
    sendVoiceNote: async (accountId, jid, voiceNote) => {
      events.sent = { accountId, jid, voiceNote };
      return { providerMessageId: "provider-audio-1" };
    },
  };
  const conversations = {
    getConversation: async () => ({ id: 4, accountId: 1, whatsappJid: "15551234567@s.whatsapp.net" }),
    createOutboundVoiceNote: async (conversationId, audio) => {
      events.stored = { conversationId, audio };
      return 77;
    },
    startDeliveryAttempt: async (messageId) => {
      events.attempts.push(["start", messageId]);
      return 1;
    },
    completeDeliveryAttempt: async (messageId, attempt, providerMessageId) => {
      events.attempts.push(["complete", messageId, attempt, providerMessageId]);
    },
    findOrCreateConversation: async () => 4,
    appendInboundMessage: async (...args) => {
      events.inbound = args;
      return { id: 88, created: true };
    },
  };
  const gateway = {
    emitNewMessage: (conversationId) => events.emitted.push(conversationId),
  };
  const drafts = {
    analyzeInboundMessage: async () => { events.analyzed += 1; },
  };
  const voiceNoteTranscoder = {
    prepareForWhatsApp: async (voiceNote) => ({
      ...voiceNote,
      data: Buffer.from("OggS-normalized-audio"),
      mimeType: "audio/ogg; codecs=opus",
      sizeBytes: 20,
      sha256: "a".repeat(64),
    }),
  };
  const service = new MessagingService(pool, channel, conversations, gateway, drafts, voiceNoteTranscoder);
  service.accounts.set(1, { id: 1, label: "Primary WhatsApp", authKey: "primary", status: "connected", qr: null, phoneNumber: "15550000000", isPrimary: true, createdAt: new Date().toISOString(), lastConnectedAt: null });
  return { service, events };
}

async function testOutboundVoiceNote() {
  const { service, events } = createService();
  await service.sendVoiceNote(4, validWebm, 3, 12);
  assert.equal(events.stored.conversationId, 4);
  assert.equal(events.stored.audio.mimeType, "audio/ogg; codecs=opus");
  assert.equal(events.stored.audio.durationSeconds, 3);
  assert.equal(events.stored.audio.sha256.length, 64);
  assert.equal(events.sent.jid, "15551234567@s.whatsapp.net");
  assert.equal(events.sent.accountId, 1);
  assert.deepEqual(events.attempts, [["start", 77], ["complete", 77, 1, "provider-audio-1"]]);
  assert.deepEqual(events.emitted, [4]);
}

async function testRealWebmToWhatsAppOggConversion() {
  const generated = spawnSync(
    ffmpegPath,
    [
      "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
      "-t", "0.2", "-c:a", "libopus", "-f", "webm", "pipe:1",
    ],
    { maxBuffer: 2 * 1024 * 1024 },
  );
  assert.equal(generated.status, 0, generated.stderr.toString("utf8"));
  const input = validateVoiceNote(generated.stdout, 1);
  const converted = await new VoiceNoteTranscoder().prepareForWhatsApp(input);
  assert.equal(converted.mimeType, "audio/ogg; codecs=opus");
  assert.equal(converted.data.subarray(0, 4).toString("ascii"), "OggS");
  assert.notEqual(converted.sha256, input.sha256);
}

async function testInboundAudioSkipsTextAnalysis() {
  const { service, events } = createService();
  const audio = validateVoiceNote(validWebm, 2);
  await service.handleInbound({
    accountId: 1,
    providerMessageId: "inbound-audio-1",
    jid: "15551234567@s.whatsapp.net",
    phoneNumber: "15551234567",
    displayName: "Client",
    body: "[Voice note]",
    senderJid: "15551234567@s.whatsapp.net",
    messageType: "audio",
    audio,
  });
  assert.equal(events.inbound[4], "audio");
  assert.equal(events.inbound[5].sha256, audio.sha256);
  assert.equal(events.analyzed, 0, "voice notes must not be passed to the text-only AI intake parser");
}

async function testValidation() {
  assert.throws(() => validateVoiceNote(Buffer.from("not audio"), null), BadRequestException);
  assert.throws(() => validateVoiceNote(Buffer.alloc(0), null), BadRequestException);
  assert.throws(() => validateVoiceNote(validWebm, 4000), BadRequestException);
}

Promise.all([testOutboundVoiceNote(), testInboundAudioSkipsTextAnalysis(), testValidation(), testRealWebmToWhatsAppOggConversion()])
  .then(() => console.log("WhatsApp voice-note regression tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
