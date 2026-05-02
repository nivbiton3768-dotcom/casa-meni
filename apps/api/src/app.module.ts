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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
