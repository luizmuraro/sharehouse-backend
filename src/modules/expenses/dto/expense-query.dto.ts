import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../schemas/expense.schema';

export class ExpenseQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional()
  @IsMongoId()
  paidBy?: string;
}
