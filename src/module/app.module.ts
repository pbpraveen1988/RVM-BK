import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController, DataController, UserController, AttachmentController, CampaignController } from '../controllers';
import { AppService, DataService, UserService, AttachmentService, CampaignService } from '../services';
import { LoggerMiddleware } from '../middleware';
import { DatabaseModule } from './database.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: '/src/public',
    })
  ],
  controllers: [AppController, DataController, UserController, AttachmentController, CampaignController],
  providers: [AppService, DataService, UserService, AttachmentService, CampaignService],
})
export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware);

  }
}
