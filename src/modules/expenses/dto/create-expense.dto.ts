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

export class CreateExpenseDto {
  @IsString()
  @MaxLength(200)
  description: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(EXPENSE_CATEGORIES)
  category: ExpenseCategory;

  @IsMongoId()
  paidBy: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  splitRatio: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  receiptUrl?: string;
}
