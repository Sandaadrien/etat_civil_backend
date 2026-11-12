import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { ConfigModule } from '@nestjs/config';
import { AgentsModule } from './agents/agents.module';
import { GeographyModule } from './geography/geography.module';
import { EnrolmentModule } from './enrolment/enrolment.module';
import { ReferenceModule } from './reference/reference.module';
import { DocumentTypeService } from './document-type/document-type.service';
import { DocumentTypeModule } from './document-type/document-type.module';
import { UploadsModule } from './uploads/uploads.module';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivationModule } from './activation/activation.module';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AgentsModule,
    GeographyModule,
    EnrolmentModule,
    ReferenceModule,
    DocumentTypeModule,
    UploadsModule,
    DashboardModule,
    ActivationModule,
  ],
  controllers: [AppController, DashboardController],
  providers: [AppService, DocumentTypeService, DashboardService],
})
export class AppModule {}
