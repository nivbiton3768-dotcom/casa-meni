import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateDocumentDto {
  @IsString() name: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() leaseId?: string;
  @IsString() fileUrl: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsNumber() @Min(0) sizeBytes?: number;
}
