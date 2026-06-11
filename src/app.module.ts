import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule as V1UsersModule } from './v1/users/users.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './v1/auth/auth.module.js';
import { JWTService } from './utils/jwt.js';
import { UsersController as V1UsersController } from './v1/users/users.controller.js';
import { UsersController as V2UsersController } from './v2/users/users.controller.js';
import { UsersModule as V2UsersModule } from './v2/users/users.module.js';
import { PricePlansModule } from './v1/price-plans/price-plans.module.js';
import { ClassesModule } from './v1/classes/classes.module.js';
import { ClassContentsModule } from './v1/class-contents/class-contents.module.js';
import { EnrollmentsModule } from './v1/enrollments/enrollments.module.js';
import { PricePlansController } from './v1/price-plans/price-plans.controller.js';
import { ClassesController } from './v1/classes/classes.controller.js';
import { ClassPlanLinkModule } from './v1/class-plan-link/class-plan-link.module.js';
import { ClassPlanLinkController } from './v1/class-plan-link/class-plan-link.controller.js';
import { StudentsModule } from './v1/students/students.module.js';
import { EnrollmentsController } from './v1/enrollments/enrollments.controller.js';
import { ClassContentsController } from './v1/class-contents/class-contents.controller.js';
import { StudentsController } from './v1/students/students.controller.js';
import { ConfigModule } from '@nestjs/config';
import { GoogleAuthModule } from './v1/google-auth/google-auth.module.js';
import { AccessRequestModule } from './v1/access-request/access-request.module.js';
import { NotificationsModule } from './v1/notifications/notifications.module.js';
import { NotificationsController } from './v1/notifications/notifications.controller.js';
import { AccessRequestController } from './v1/access-request/access-request.controller.js';
import { AnalyticsModule } from './v1/analytics/analytics.module.js';
import { AnalyticsController } from './v1/analytics/analytics.controller.js';
import { EmailsModule } from './v1/emails/emails.module.js';
import { TestsModule } from './v1/tests/tests.module.js';
import { TestsController } from './v1/tests/tests.controller.js';
import { MediaModule } from './v1/media/media.module.js';
import { MediaController } from './v1/media/media.controller.js';
import { VideosModule } from './v1/videos/videos.module.js';
import { VideosController } from './v1/videos/videos.controller.js';
import { CloudfalreModule } from './v1/cloudfalre/cloudfalre.module.js';
import { UserManagementModule } from './v1/admin-action/user-management/user-management.module.js';
import { UserManagementController } from './v1/admin-action/user-management/user-management.controller.js';
import { UserEnrollmentModule } from './v1/admin-action/user-enrollment/user-enrollment.module.js';
import { UserEnrollmentController } from './v1/admin-action/user-enrollment/user-enrollment.controller.js';
import { UserAccessRequestModule } from './v1/admin-action/user-access-request/user-access-request.module.js';
import { UserAccessRequestController } from './v1/admin-action/user-access-request/user-access-request.controller.js';
import { AdminAnalyticsModule } from './v1/admin-action/admin-analytics/admin-analytics.module.js';
import { AdminAnalyticsController } from './v1/admin-action/admin-analytics/admin-analytics.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // configure as a global module
    }),
    DatabaseModule,
    V1UsersModule,
    AuthModule,
    V2UsersModule,
    PricePlansModule,
    ClassesModule,
    ClassContentsModule,
    EnrollmentsModule,
    ClassPlanLinkModule,
    StudentsModule,
    GoogleAuthModule,
    AccessRequestModule,
    NotificationsModule,
    AnalyticsModule,
    EmailsModule,
    TestsModule,
    MediaModule,
    VideosModule,
    CloudfalreModule,
    UserManagementModule,
    UserEnrollmentModule,
    UserAccessRequestModule,
    AdminAnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // apply middleware to specific routes
    consumer
      .apply(JWTService)
      .exclude({ path: 'videos/key/:videoId', method: RequestMethod.GET })
      .forRoutes(
        V1UsersController,
        V2UsersController,
        PricePlansController,
        ClassesController,
        ClassPlanLinkController,
        EnrollmentsController,
        StudentsController,
        ClassContentsController,
        NotificationsController,
        AccessRequestController,
        AnalyticsController,
        TestsController,
        MediaController,
        VideosController,
        // auth routes that require authentication
        {
          path: 'auth/signup',
          method: RequestMethod.PATCH,
        },
        {
          path: 'auth/update-password',
          method: RequestMethod.PATCH,
        },
        {
          path: 'auth/profile',
          method: RequestMethod.PATCH,
        },

        // admin actions
        UserManagementController,
        UserEnrollmentController,
        UserAccessRequestController,
        AdminAnalyticsController,
      );
  }
}
