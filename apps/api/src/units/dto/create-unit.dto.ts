import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  propertyId: string;

  @IsString()
  unitNumber: string;

  @IsNumber()
  bedrooms: number;

  @IsNumber()
  bathrooms: number;

  @IsOptional()
  @IsNumber()
  sqft?: number;

  @IsNumber()
  rentAmountCents: number;
}
