export enum PropertyType {
  LONG_TERM_RENTAL = 'LONG_TERM_RENTAL',
  SHORT_TERM_RENTAL = 'SHORT_TERM_RENTAL',
  RENOVATION = 'RENOVATION',
  FOR_SALE = 'FOR_SALE',
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum UnitStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
}

export interface Property {
  id: string;
  tenantId: string;
  entityId: string | null;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: PropertyType;
  status: PropertyStatus;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  tenantId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  rentAmountCents: number;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
}
