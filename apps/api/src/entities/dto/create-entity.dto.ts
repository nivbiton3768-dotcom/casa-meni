import { IsString, IsOptional } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  ein?: string;
}
