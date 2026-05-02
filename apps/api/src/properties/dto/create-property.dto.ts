import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zip: string;

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Knowledge base / welcome guide
  @IsOptional()
  @IsString()
  wifiName?: string;

  @IsOptional()
  @IsString()
  wifiPassword?: string;

  @IsOptional()
  @IsString()
  parkingInfo?: string;

  @IsOptional()
  @IsString()
  utilityNotes?: string;

  @IsOptional()
  @IsString()
  applianceNotes?: string;

  @IsOptional()
  @IsString()
  emergencyContacts?: string;

  @IsOptional()
  @IsString()
  houseRules?: string;

  @IsOptional()
  @IsString()
  localRecommendations?: string;
}
