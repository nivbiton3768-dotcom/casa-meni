import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateDistributionDto {
  @IsString()
  investorId: string;

  @IsNumber()
  @Min(1)
  amountCents: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
