import "reflect-metadata";
import { config as loadDotenv } from "dotenv";

loadDotenv();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`YB Travel API listening on port ${env.PORT}`);
}

bootstrap();
