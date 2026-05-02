export enum Role {
  OWNER = 'OWNER',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  TENANT = 'TENANT',
  MAINTENANCE_TECH = 'MAINTENANCE_TECH',
  CLEANING_TEAM = 'CLEANING_TEAM',
  INVESTOR = 'INVESTOR',
  VENDOR = 'VENDOR',
  GUEST = 'GUEST',
  ACCOUNTANT = 'ACCOUNTANT',
  INSPECTOR = 'INSPECTOR',
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}
