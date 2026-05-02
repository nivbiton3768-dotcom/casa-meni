import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsInt()
  @Min(0)
  parLevel!: number;

  @IsInt()
  @Min(0)
  currentQty!: number;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  parLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentQty?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdjustQtyDto {
  @IsInt()
  delta!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
