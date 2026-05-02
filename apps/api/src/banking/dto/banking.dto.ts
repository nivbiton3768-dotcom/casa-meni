import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankAccountType, BankTransactionDirection } from '@prisma/client';

export class ExchangePublicTokenDto {
  @IsString()
  @IsNotEmpty()
  publicToken!: string;

  @IsOptional()
  metadata?: unknown;
}

export class CreateManualAccountDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(BankAccountType)
  type!: BankAccountType;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsInt()
  openingBalanceCents?: number;
}

export class CreateManualTransactionDto {
  @IsString()
  @IsNotEmpty()
  bankAccountId!: string;

  @IsEnum(BankTransactionDirection)
  direction!: BankTransactionDirection;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchTransactionDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;
}

export class CsvRowDto {
  @IsEnum(BankTransactionDirection)
  direction!: BankTransactionDirection;

  @IsInt()
  amountCents!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ImportCsvDto {
  @IsString()
  @IsNotEmpty()
  bankAccountId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvRowDto)
  rows!: CsvRowDto[];
}
