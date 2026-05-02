import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString() propertyId: string;
  @IsString() unitId: string;
  @IsString() guestName: string;
  @IsOptional() @IsString() guestEmail?: string;
  @IsOptional() @IsString() guestPhone?: string;
  @IsOptional() @IsString() channel?: string;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @IsNumber() @Min(1) nightlyRateCents: number;
  @IsNumber() @Min(0) totalCents: number;
  @IsOptional() @IsNumber() cleaningFeeCents?: number;
  @IsOptional() @IsString() notes?: string;
}
