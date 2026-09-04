import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useAuth } from "../lib/AuthContext";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      await navigate({ to: redirect ?? "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-yb-panel-head">
      <form
        onSubmit={handleSubmit}
        className="w-[340px] rounded-yb border border-yb-line bg-white p-[28px] shadow-sm"
      >
        <div className="mb-[18px] flex items-center gap-[10px]">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-yb-tile bg-yb-gold text-[12px] font-black tracking-[0.5px] text-yb-green">
            YB
          </div>
          <div className="text-[17px] font-black tracking-[0.4px] text-yb-green">YB TRAVEL</div>
        </div>

        <label className="mb-3 block text-[13px] text-yb-muted">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-[34px] w-full rounded-yb border border-yb-line-btn px-[9px] text-[14px] text-yb-ink outline-none"
          />
        </label>

        <label className="mb-4 block text-[13px] text-yb-muted">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-[34px] w-full rounded-yb border border-yb-line-btn px-[9px] text-[14px] text-yb-ink outline-none"
          />
        </label>

        {error && <div className="mb-3 text-[13px] text-yb-red">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="h-[36px] w-full rounded-yb border border-yb-gold-border bg-yb-gold text-[14px] font-bold text-yb-gold-text hover:bg-yb-gold-hover disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
