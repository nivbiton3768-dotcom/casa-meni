import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ChannelProvider } from '@prisma/client';

export class CreateChannelFeedDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsEnum(ChannelProvider)
  provider!: ChannelProvider;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUrl({ require_protocol: true })
  importUrl!: string;
}

export class UpdateChannelFeedDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  importUrl?: string;

  @IsOptional()
  isActive?: boolean;
}
