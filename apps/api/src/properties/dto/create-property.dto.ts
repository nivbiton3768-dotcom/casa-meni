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
}
