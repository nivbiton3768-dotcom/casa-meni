import { IsString, IsEnum, IsOptional } from 'class-validator';
import { JobPriority } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  propertyId: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsString()
  category?: string;
}
