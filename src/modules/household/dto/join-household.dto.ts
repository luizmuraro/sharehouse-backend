import { IsString, Length, Matches } from 'class-validator';

export class JoinHouseholdDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/)
  inviteCode: string;
}
