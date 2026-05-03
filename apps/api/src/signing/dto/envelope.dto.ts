import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnvelopeSignerDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateEnvelopeDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  sourceFileUrl!: string;

  @IsString()
  sourceFileName!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  leaseId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  expiresInDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvelopeSignerDto)
  signers!: EnvelopeSignerDto[];
}

export class SignEnvelopeDto {
  @IsString()
  signatureDataUrl!: string;
}

export class DeclineEnvelopeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
