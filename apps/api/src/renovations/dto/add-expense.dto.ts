import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class AddExpenseDto {
  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  amountCents: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
