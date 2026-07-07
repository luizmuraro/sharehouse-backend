import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '../../expenses/schemas/expense.schema';

export const RECEIPT_FILE_TYPES = ['image', 'pdf'] as const;
export type ReceiptFileType = (typeof RECEIPT_FILE_TYPES)[number];
export type ReceiptDocument = HydratedDocument<Receipt>;

@Schema({ timestamps: true })
export class Receipt {
  @Prop({ type: Types.ObjectId, ref: 'Household', required: true, index: true })
  householdId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ type: Number, default: null, min: 0 })
  amount: number | null;

  @Prop({
    type: String,
    required: true,
    enum: EXPENSE_CATEGORIES,
    default: 'outros',
  })
  category: ExpenseCategory;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Expense', default: null, index: true })
  linkedExpenseId: Types.ObjectId | null;

  @Prop({ type: String, required: true, enum: RECEIPT_FILE_TYPES })
  fileType: ReceiptFileType;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 1 })
  sizeBytes: number;

  @Prop({ required: true })
  fileKey: string;

  @Prop({ required: true })
  fileUrl: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ReceiptSchema = SchemaFactory.createForClass(Receipt);
ReceiptSchema.index({ householdId: 1, date: -1 });
