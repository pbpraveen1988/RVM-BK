import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join('src', 'public'));
  await app.listen(80);
}
bootstrap();
