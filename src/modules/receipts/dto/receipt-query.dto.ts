import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '../../expenses/schemas/expense.schema';

export class ReceiptQueryDto {
  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional()
  @IsMongoId()
  linkedExpenseId?: string;
}
