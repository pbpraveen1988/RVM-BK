import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';
var timeout = require('connect-timeout')

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join('dist','public'));
  app.use(bodyParser.json({ limit: '500mb' }));
  app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
  app.use(timeout('10m'))
  await app.listen(80);
}
bootstrap();
