import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateRenovationDto {
  @IsString()
  propertyId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  budgetCents: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
