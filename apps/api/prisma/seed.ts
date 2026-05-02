import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Casa Meni database...');

  // Clear existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.cleaningSchedule.deleteMany();
  await prisma.renovationExpense.deleteMany();
  await prisma.renovation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.investor.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.maintenanceJob.deleteMany();
  await prisma.property.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('  Cleared existing data');

  // Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Casa Meni',
      slug: 'casa-meni',
    },
  });
  console.log('  Created organization:', org.name);

  // Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'meni@casameni.com',
      passwordHash,
      name: 'Meni (Owner)',
      phone: '(305) 555-0100',
      role: 'OWNER',
    },
  });

  const pm = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'sarah@casameni.com',
      passwordHash,
      name: 'Sarah Johnson',
      phone: '(305) 555-0101',
      role: 'PROPERTY_MANAGER',
    },
  });

  const tech = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'carlos@casameni.com',
      passwordHash,
      name: 'Carlos Rivera',
      phone: '(305) 555-0102',
      role: 'MAINTENANCE_TECH',
    },
  });

  const cleaner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'maria@casameni.com',
      passwordHash,
      name: 'Maria Santos',
      phone: '(305) 555-0103',
      role: 'CLEANING_TEAM',
    },
  });

  const tenant1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'james@tenant.com',
      passwordHash,
      name: 'James Williams',
      phone: '(305) 555-0200',
      role: 'TENANT',
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'lisa@tenant.com',
      passwordHash,
      name: 'Lisa Chen',
      phone: '(305) 555-0201',
      role: 'TENANT',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'david@casameni.com',
      passwordHash,
      name: 'David Park',
      phone: '(305) 555-0104',
      role: 'ACCOUNTANT',
    },
  });

  const investor = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'rob@investor.com',
      passwordHash,
      name: 'Robert Sterling',
      phone: '(212) 555-0300',
      role: 'INVESTOR',
    },
  });

  console.log('  Created 8 users');

  // Entity
  const entity = await prisma.entity.create({
    data: {
      organizationId: org.id,
      name: 'Casa Meni Holdings LLC',
      type: 'LLC',
      ein: '12-3456789',
    },
  });

  // Investors
  await prisma.investor.createMany({
    data: [
      {
        organizationId: org.id,
        entityId: entity.id,
        name: 'Meni (Managing Member)',
        email: 'meni@casameni.com',
        ownershipPct: 60.0,
      },
      {
        organizationId: org.id,
        entityId: entity.id,
        name: 'Robert Sterling',
        email: 'rob@investor.com',
        phone: '(212) 555-0300',
        ownershipPct: 25.0,
      },
      {
        organizationId: org.id,
        entityId: entity.id,
        name: 'Angela Torres',
        email: 'angela@investor.com',
        phone: '(415) 555-0301',
        ownershipPct: 15.0,
      },
    ],
  });
  console.log('  Created entity + 3 investors');

  // Vendors
  const vendorHD = await prisma.vendor.create({
    data: {
      organizationId: org.id,
      name: 'Home Depot',
      trade: 'materials',
      phone: '(800) 466-3337',
    },
  });

  const vendorPlumber = await prisma.vendor.create({
    data: {
      organizationId: org.id,
      name: "Mike's Plumbing",
      trade: 'plumber',
      email: 'mike@mikesplumbing.com',
      phone: '(305) 555-0400',
    },
  });

  const vendorElec = await prisma.vendor.create({
    data: {
      organizationId: org.id,
      name: 'Spark Electric Co',
      trade: 'electrician',
      email: 'info@sparkelectric.com',
      phone: '(305) 555-0401',
    },
  });

  const vendorGC = await prisma.vendor.create({
    data: {
      organizationId: org.id,
      name: 'Torres General Contracting',
      trade: 'general contractor',
      email: 'torres@tgc.com',
      phone: '(305) 555-0402',
    },
  });
  console.log('  Created 4 vendors');

  // Properties
  const prop1 = await prisma.property.create({
    data: {
      organizationId: org.id,
      entityId: entity.id,
      name: 'Brickell Apartments',
      address: '1250 SW 1st Ave',
      city: 'Miami',
      state: 'FL',
      zip: '33130',
      type: 'LONG_TERM_RENTAL',
      purchasePrice: 850000_00,
      purchaseDate: new Date('2023-06-15'),
      currentValue: 920000_00,
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      organizationId: org.id,
      entityId: entity.id,
      name: 'South Beach Villa',
      address: '420 Ocean Dr',
      city: 'Miami Beach',
      state: 'FL',
      zip: '33139',
      type: 'SHORT_TERM_RENTAL',
      purchasePrice: 1200000_00,
      purchaseDate: new Date('2022-11-01'),
      currentValue: 1350000_00,
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      organizationId: org.id,
      entityId: entity.id,
      name: 'Wynwood Duplex',
      address: '2815 NW 2nd Ave',
      city: 'Miami',
      state: 'FL',
      zip: '33127',
      type: 'RENOVATION',
      purchasePrice: 475000_00,
      purchaseDate: new Date('2025-01-10'),
      currentValue: 475000_00,
      notes: 'Full gut renovation in progress. Target completion Q3 2026.',
    },
  });

  const prop4 = await prisma.property.create({
    data: {
      organizationId: org.id,
      name: 'Coral Gables Townhouse',
      address: '105 Alhambra Cir',
      city: 'Coral Gables',
      state: 'FL',
      zip: '33134',
      type: 'FOR_SALE',
      purchasePrice: 620000_00,
      purchaseDate: new Date('2021-03-20'),
      currentValue: 710000_00,
    },
  });

  const prop5 = await prisma.property.create({
    data: {
      organizationId: org.id,
      entityId: entity.id,
      name: 'Little Havana Fourplex',
      address: '1445 SW 8th St',
      city: 'Miami',
      state: 'FL',
      zip: '33135',
      type: 'LONG_TERM_RENTAL',
      purchasePrice: 580000_00,
      purchaseDate: new Date('2024-02-28'),
      currentValue: 615000_00,
    },
  });
  console.log('  Created 5 properties');

  // Units
  const unit1a = await prisma.unit.create({ data: { propertyId: prop1.id, unitNumber: '1A', bedrooms: 2, bathrooms: 2, sqft: 950, rentAmountCents: 2800_00 } });
  const unit1b = await prisma.unit.create({ data: { propertyId: prop1.id, unitNumber: '1B', bedrooms: 1, bathrooms: 1, sqft: 650, rentAmountCents: 2100_00 } });
  const unit2a = await prisma.unit.create({ data: { propertyId: prop1.id, unitNumber: '2A', bedrooms: 2, bathrooms: 2, sqft: 950, rentAmountCents: 2900_00, status: 'OCCUPIED' } });
  const unit2b = await prisma.unit.create({ data: { propertyId: prop1.id, unitNumber: '2B', bedrooms: 1, bathrooms: 1, sqft: 650, rentAmountCents: 2200_00, status: 'OCCUPIED' } });
  const unitSB = await prisma.unit.create({ data: { propertyId: prop2.id, unitNumber: 'MAIN', bedrooms: 3, bathrooms: 2, sqft: 1800, rentAmountCents: 350_00 } });
  const unitLH1 = await prisma.unit.create({ data: { propertyId: prop5.id, unitNumber: '1', bedrooms: 2, bathrooms: 1, sqft: 750, rentAmountCents: 1800_00, status: 'OCCUPIED' } });
  const unitLH2 = await prisma.unit.create({ data: { propertyId: prop5.id, unitNumber: '2', bedrooms: 2, bathrooms: 1, sqft: 750, rentAmountCents: 1800_00, status: 'OCCUPIED' } });
  const unitLH3 = await prisma.unit.create({ data: { propertyId: prop5.id, unitNumber: '3', bedrooms: 1, bathrooms: 1, sqft: 550, rentAmountCents: 1500_00 } });
  const unitLH4 = await prisma.unit.create({ data: { propertyId: prop5.id, unitNumber: '4', bedrooms: 1, bathrooms: 1, sqft: 550, rentAmountCents: 1500_00, status: 'MAINTENANCE' } });
  console.log('  Created 9 units');

  // Leases
  const lease1 = await prisma.lease.create({
    data: { organizationId: org.id, unitId: unit2a.id, tenantId: tenant1.id, status: 'ACTIVE', startDate: new Date('2025-01-01'), endDate: new Date('2026-12-31'), rentAmountCents: 2900_00, depositCents: 2900_00 },
  });
  const lease2 = await prisma.lease.create({
    data: { organizationId: org.id, unitId: unit2b.id, tenantId: tenant2.id, status: 'ACTIVE', startDate: new Date('2025-03-01'), endDate: new Date('2026-02-28'), rentAmountCents: 2200_00, depositCents: 2200_00 },
  });

  const months = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'];
  for (const m of months) {
    await prisma.payment.create({
      data: { leaseId: lease1.id, amountCents: 2900_00, dueDate: new Date(m), paidAt: new Date(new Date(m).getTime() + 2 * 86400000), method: 'ach' },
    });
  }
  await prisma.payment.create({
    data: { leaseId: lease1.id, amountCents: 2900_00, dueDate: new Date('2026-05-01') },
  });
  console.log('  Created 2 leases + 5 payments');

  // Reservations
  await prisma.reservation.create({
    data: { organizationId: org.id, propertyId: prop2.id, unitId: unitSB.id, guestName: 'Michael Brown', guestEmail: 'mbrown@gmail.com', guestPhone: '(646) 555-0500', channel: 'airbnb', externalId: 'ABB-892341', status: 'CHECKED_OUT', checkIn: new Date('2026-04-10'), checkOut: new Date('2026-04-17'), nightlyRateCents: 450_00, totalCents: 3350_00, cleaningFeeCents: 200_00 },
  });
  const upcomingRes = await prisma.reservation.create({
    data: { organizationId: org.id, propertyId: prop2.id, unitId: unitSB.id, guestName: 'Emma Wilson', guestEmail: 'emma.w@outlook.com', channel: 'vrbo', externalId: 'VRBO-441289', status: 'CONFIRMED', checkIn: new Date('2026-05-05'), checkOut: new Date('2026-05-12'), nightlyRateCents: 475_00, totalCents: 3525_00, cleaningFeeCents: 200_00 },
  });
  await prisma.reservation.create({
    data: { organizationId: org.id, propertyId: prop2.id, unitId: unitSB.id, guestName: 'David Kim', guestEmail: 'dkim@yahoo.com', channel: 'direct', status: 'CONFIRMED', checkIn: new Date('2026-05-20'), checkOut: new Date('2026-05-25'), nightlyRateCents: 500_00, totalCents: 2700_00, cleaningFeeCents: 200_00 },
  });
  console.log('  Created 3 reservations');

  await prisma.cleaningSchedule.create({
    data: { reservationId: upcomingRes.id, unitId: unitSB.id, assigneeId: cleaner.id, scheduledDate: new Date('2026-05-05'), notes: 'Deep clean before guest check-in' },
  });

  // Maintenance Jobs
  await prisma.maintenanceJob.create({
    data: { organizationId: org.id, propertyId: prop1.id, unitId: unit2a.id, createdById: tenant1.id, assignedToId: tech.id, title: 'Leaking kitchen faucet', description: 'The kitchen faucet drips constantly even when fully closed.', priority: 'MEDIUM', status: 'IN_PROGRESS', category: 'plumbing', estimateCents: 250_00, scheduledDate: new Date('2026-05-03') },
  });
  await prisma.maintenanceJob.create({
    data: { organizationId: org.id, propertyId: prop1.id, unitId: unit1b.id, createdById: pm.id, title: 'Prepare unit for new tenant', description: 'Full unit turnover: paint, deep clean, replace carpet, fix exhaust fan.', priority: 'HIGH', status: 'OPEN', category: 'general', estimateCents: 1200_00 },
  });
  await prisma.maintenanceJob.create({
    data: { organizationId: org.id, propertyId: prop5.id, unitId: unitLH4.id, createdById: pm.id, assignedToId: tech.id, title: 'HVAC not cooling', description: 'AC unit running but not producing cold air.', priority: 'EMERGENCY', status: 'IN_PROGRESS', category: 'hvac', estimateCents: 800_00, scheduledDate: new Date('2026-05-02') },
  });
  await prisma.maintenanceJob.create({
    data: { organizationId: org.id, propertyId: prop2.id, createdById: cleaner.id, title: 'Pool pump making noise', description: 'Grinding sound from pool pump.', priority: 'LOW', status: 'OPEN', category: 'general' },
  });
  console.log('  Created 4 maintenance jobs');

  // Renovation
  const reno = await prisma.renovation.create({
    data: { propertyId: prop3.id, name: 'Full Gut Renovation', status: 'IN_PROGRESS', budgetCents: 180000_00, actualCostCents: 87500_00, startDate: new Date('2025-02-01'), endDate: new Date('2026-08-31'), notes: 'Converting to modern 2-unit duplex.' },
  });
  await prisma.renovationExpense.createMany({
    data: [
      { renovationId: reno.id, vendorId: vendorGC.id, category: 'labor', description: 'Demolition and framing', amountCents: 22000_00, date: new Date('2025-02-15') },
      { renovationId: reno.id, vendorId: vendorElec.id, category: 'labor', description: 'Full electrical rewire', amountCents: 14500_00, date: new Date('2025-03-20') },
      { renovationId: reno.id, vendorId: vendorPlumber.id, category: 'labor', description: 'Plumbing rough-in', amountCents: 11000_00, date: new Date('2025-04-10') },
      { renovationId: reno.id, vendorId: vendorHD.id, category: 'materials', description: 'Lumber, drywall, insulation', amountCents: 8500_00, date: new Date('2025-03-01') },
      { renovationId: reno.id, vendorId: vendorHD.id, category: 'materials', description: 'Kitchen cabinets & countertops', amountCents: 12000_00, date: new Date('2025-06-15') },
      { renovationId: reno.id, vendorId: vendorHD.id, category: 'fixtures', description: 'Bathroom fixtures and tile', amountCents: 6500_00, date: new Date('2025-07-01') },
      { renovationId: reno.id, category: 'permits', description: 'Building permits and inspections', amountCents: 4500_00, date: new Date('2025-01-25') },
      { renovationId: reno.id, vendorId: vendorGC.id, category: 'labor', description: 'Roofing replacement', amountCents: 8500_00, date: new Date('2025-05-10') },
    ],
  });
  console.log('  Created renovation with 8 expenses');

  await prisma.listing.create({
    data: { propertyId: prop4.id, status: 'ACTIVE', askingPriceCents: 725000_00, description: 'Beautiful 3BR/2BA townhouse in Coral Gables. Updated kitchen, hardwood floors.', publishedAt: new Date('2026-04-15') },
  });

  const txData = [
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2A (Jan)', amountCents: 2900_00, date: new Date('2026-01-03') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2B (Jan)', amountCents: 2200_00, date: new Date('2026-01-05') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2A (Feb)', amountCents: 2900_00, date: new Date('2026-02-03') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2B (Feb)', amountCents: 2200_00, date: new Date('2026-02-04') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2A (Mar)', amountCents: 2900_00, date: new Date('2026-03-03') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2B (Mar)', amountCents: 2200_00, date: new Date('2026-03-02') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2A (Apr)', amountCents: 2900_00, date: new Date('2026-04-03') },
    { type: 'INCOME' as const, propertyId: prop1.id, category: 'rent', description: 'Rent - Unit 2B (Apr)', amountCents: 2200_00, date: new Date('2026-04-05') },
    { type: 'INCOME' as const, propertyId: prop2.id, category: 'rental_income', description: 'Airbnb payout - M.Brown (Apr 10-17)', amountCents: 3350_00, date: new Date('2026-04-18') },
    { type: 'INCOME' as const, propertyId: prop5.id, category: 'rent', description: 'Rent - Units 1&2 (Apr)', amountCents: 3600_00, date: new Date('2026-04-02') },
    { type: 'EXPENSE' as const, propertyId: prop1.id, category: 'insurance', description: 'Annual property insurance - Brickell', amountCents: 4800_00, date: new Date('2026-01-15') },
    { type: 'EXPENSE' as const, propertyId: prop1.id, category: 'taxes', description: 'Q1 property tax', amountCents: 3200_00, date: new Date('2026-03-31') },
    { type: 'EXPENSE' as const, propertyId: prop1.id, category: 'maintenance', description: 'Plumbing repair - Unit 1A', amountCents: 380_00, date: new Date('2026-02-18') },
    { type: 'EXPENSE' as const, propertyId: prop2.id, category: 'utilities', description: 'Electric bill (Mar)', amountCents: 285_00, date: new Date('2026-03-28') },
    { type: 'EXPENSE' as const, propertyId: prop2.id, category: 'insurance', description: 'Annual STR insurance', amountCents: 6200_00, date: new Date('2026-01-20') },
    { type: 'EXPENSE' as const, propertyId: prop2.id, category: 'cleaning', description: 'Turnover cleaning (Apr)', amountCents: 200_00, date: new Date('2026-04-17') },
    { type: 'EXPENSE' as const, propertyId: prop5.id, category: 'mortgage', description: 'Mortgage payment (Apr)', amountCents: 3100_00, date: new Date('2026-04-01') },
    { type: 'EXPENSE' as const, propertyId: prop5.id, category: 'utilities', description: 'Water bill Q1', amountCents: 420_00, date: new Date('2026-03-15') },
    { type: 'EXPENSE' as const, category: 'management', description: 'Property management software', amountCents: 149_00, date: new Date('2026-04-01') },
  ];
  for (const tx of txData) {
    await prisma.transaction.create({ data: { organizationId: org.id, ...tx } });
  }
  console.log('  Created 19 transactions');

  await prisma.document.createMany({
    data: [
      { organizationId: org.id, propertyId: prop1.id, leaseId: lease1.id, name: 'Lease Agreement - James Williams.pdf', fileUrl: '/documents/lease-2a.pdf', mimeType: 'application/pdf', sizeBytes: 245000 },
      { organizationId: org.id, propertyId: prop1.id, leaseId: lease2.id, name: 'Lease Agreement - Lisa Chen.pdf', fileUrl: '/documents/lease-2b.pdf', mimeType: 'application/pdf', sizeBytes: 238000 },
      { organizationId: org.id, propertyId: prop4.id, name: 'Property Inspection Report.pdf', fileUrl: '/documents/inspection-cg.pdf', mimeType: 'application/pdf', sizeBytes: 1250000 },
      { organizationId: org.id, propertyId: prop3.id, name: 'Renovation Plans - Wynwood.pdf', fileUrl: '/documents/reno-plans.pdf', mimeType: 'application/pdf', sizeBytes: 5400000 },
    ],
  });

  await prisma.contact.createMany({
    data: [
      { organizationId: org.id, name: 'John Realty', email: 'john@miamirealty.com', phone: '(305) 555-0600', role: 'Real Estate Agent' },
      { organizationId: org.id, name: 'Patricia Law', email: 'pat@lawoffice.com', phone: '(305) 555-0601', role: 'Real Estate Attorney' },
      { organizationId: org.id, name: 'First National Bank', phone: '(800) 555-0700', role: 'Lender', notes: 'Commercial lending department' },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: owner.id, action: 'CREATE', entity: 'Property', entityId: prop1.id, payload: { name: 'Brickell Apartments' } },
      { userId: pm.id, action: 'CREATE', entity: 'MaintenanceJob', entityId: 'seed', payload: { title: 'Leaking kitchen faucet' } },
      { userId: owner.id, action: 'CREATE', entity: 'Listing', entityId: prop4.id, payload: { askingPrice: 725000 } },
    ],
  });

  // Suppress unused variable warnings
  void [unit1a, unit1b, unitLH1, unitLH2, unitLH3, unitLH4, accountant, investor];

  console.log('\n=== SEED COMPLETE ===');
  console.log('\nTest Accounts (all passwords: password123):');
  console.log('┌─────────────────────┬──────────────────────────┬───────────────────┐');
  console.log('│ Role                │ Email                    │ Portal            │');
  console.log('├─────────────────────┼──────────────────────────┼───────────────────┤');
  console.log('│ Owner/Admin         │ meni@casameni.com        │ /dashboard        │');
  console.log('│ Property Manager    │ sarah@casameni.com       │ /dashboard        │');
  console.log('│ Maintenance Tech    │ carlos@casameni.com      │ /dashboard        │');
  console.log('│ Cleaning Team       │ maria@casameni.com       │ /dashboard        │');
  console.log('│ Accountant          │ david@casameni.com       │ /dashboard        │');
  console.log('│ Investor            │ rob@investor.com         │ /dashboard        │');
  console.log('│ Tenant              │ james@tenant.com         │ /portal           │');
  console.log('│ Tenant              │ lisa@tenant.com          │ /portal           │');
  console.log('└─────────────────────┴──────────────────────────┴───────────────────┘');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
