import "reflect-metadata";
import { config as loadDotenv } from "dotenv";

loadDotenv();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { applyHttpSecurity } from "./security/http-security";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  applyHttpSecurity(app, env);
  app.enableCors({
    origin: env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: false,
    maxAge: 600,
  });
  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`YB Travel API listening on port ${env.PORT}`);
}

bootstrap();
