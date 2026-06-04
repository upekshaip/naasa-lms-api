import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { VideosService } from './services/videos.service.js';
import { VideosController } from './videos.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { VideoKeyAuthMiddleware } from '../../utils/video-key-auth.middleware.js';
import { R2Service } from '../cloudfalre/services/r2.service.js';
import { VideoKeyService } from './services/vide-key.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [VideosController],
  providers: [VideosService, R2Service, VideoKeyService],
})
export class VideosModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VideoKeyAuthMiddleware)
      .forRoutes({ path: 'videos/key/:videoId', method: RequestMethod.GET });
  }
}
