import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class JoinHouseholdDto {
  // Normalize before validation so lowercase/padded codes are accepted
  // (the regex below only matches uppercase). Runs during ValidationPipe transform.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/)
  inviteCode: string;
}
