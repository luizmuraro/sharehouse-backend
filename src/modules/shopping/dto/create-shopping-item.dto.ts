import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateShoppingItemDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;
}
