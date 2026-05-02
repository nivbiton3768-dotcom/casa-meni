import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { LeasesModule } from './leases/leases.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DocumentsModule } from './documents/documents.module';
import { RenovationsModule } from './renovations/renovations.module';
import { VendorsModule } from './vendors/vendors.module';
import { InvestorsModule } from './investors/investors.module';
import { EntitiesModule } from './entities/entities.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TenantPortalModule } from './tenant-portal/tenant-portal.module';
import { SearchModule } from './search/search.module';
import { UploadsModule } from './uploads/uploads.module';
import { SigningModule } from './signing/signing.module';
import { EmailModule } from './email/email.module';
import { StripeModule } from './stripe/stripe.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EmailModule,
    StripeModule,
    PrismaModule,
    AuthModule,
    PropertiesModule,
    UnitsModule,
    LeasesModule,
    MaintenanceModule,
    TransactionsModule,
    ReservationsModule,
    DocumentsModule,
    RenovationsModule,
    VendorsModule,
    InvestorsModule,
    EntitiesModule,
    ReportsModule,
    NotificationsModule,
    TenantPortalModule,
    SearchModule,
    UploadsModule,
    SigningModule,
    PaymentsModule,
  ],
})
export class AppModule {}
