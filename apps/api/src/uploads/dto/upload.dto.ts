import { IsString, IsNumber, Min } from 'class-validator';

export class PresignedUrlDto {
  @IsString() filename: string;
  @IsString() mimeType: string;
  @IsString() entityType: string;
  @IsString() entityId: string;
}

export class ConfirmUploadDto {
  @IsString() key: string;
  @IsString() filename: string;
  @IsString() mimeType: string;
  @IsNumber() @Min(0) sizeBytes: number;
  @IsString() entityType: string;
  @IsString() entityId: string;
}
