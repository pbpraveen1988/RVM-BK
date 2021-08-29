import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController, DataController, UserController, AttachmentController } from '../controllers';
import { AppService, DataService, UserService, AttachmentService } from '../services';
import { LoggerMiddleware } from '../middleware';
import { DatabaseModule } from './database.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: '/src/public',
    })
  ],
  controllers: [AppController, DataController, UserController, AttachmentController],
  providers: [AppService, DataService, UserService, AttachmentService],
})
export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware);

  }
}
