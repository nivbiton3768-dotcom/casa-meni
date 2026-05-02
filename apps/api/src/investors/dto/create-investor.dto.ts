import { IsString, IsNumber, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreateInvestorDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  ownershipPct: number;

  @IsOptional()
  @IsString()
  entityId?: string;
}
