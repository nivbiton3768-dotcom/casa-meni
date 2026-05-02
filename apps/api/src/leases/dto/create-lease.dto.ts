import { IsString, IsNumber, IsDateString, IsOptional, IsEmail, Min } from 'class-validator';

export class CreateLeaseDto {
  @IsString()
  unitId: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsOptional()
  @IsEmail()
  tenantEmail?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  rentAmountCents: number;

  @IsNumber()
  @Min(0)
  depositCents: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFeesCents?: number;
}
