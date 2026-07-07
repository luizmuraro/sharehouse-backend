import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '../../expenses/schemas/expense.schema';

export class CreateReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsMongoId()
  linkedExpenseId?: string;
}
