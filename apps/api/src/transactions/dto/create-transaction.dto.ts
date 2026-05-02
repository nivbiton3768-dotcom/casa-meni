import { IsString, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsNumber()
  amountCents: number;

  @IsDateString()
  date: string;
}
