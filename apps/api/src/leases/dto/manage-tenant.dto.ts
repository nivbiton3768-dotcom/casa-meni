import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class TransferLeaseDto {
  @IsString()
  newUnitId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rentAmountCents?: number;
}
