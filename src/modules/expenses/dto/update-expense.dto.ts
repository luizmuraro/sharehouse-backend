import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../schemas/expense.schema';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional()
  @IsMongoId()
  paidBy?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  splitRatio?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  receiptUrl?: string;
}
