import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Env } from "../config/env";

export function securityHeaders(production: boolean): Record<string, string> {
  return {
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    ...(production ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
}

export function applyHttpSecurity(app: INestApplication, env: Env): void {
  const server = app.getHttpAdapter().getInstance() as {
    disable(name: string): void;
    set(name: string, value: boolean | number): void;
  };
  server.disable("x-powered-by");
  if (env.TRUST_PROXY === "true") server.set("trust proxy", 1);
  const headers = securityHeaders(env.NODE_ENV === "production");
  app.use((_request: Request, response: Response, next: NextFunction) => {
    Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
    next();
  });
}
