import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController, DataController, UserController } from '../controllers';
import { AppService, DataService, UserService } from '../services';
import { LoggerMiddleware } from '../middleware';
import { DatabaseModule } from './database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, DataController, UserController],
  providers: [AppService, DataService, UserService],
})
export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware);

  }
}
