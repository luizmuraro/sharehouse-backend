import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const EXPENSE_CATEGORIES = [
  'alimentacao',
  'moradia',
  'transporte',
  'saude',
  'lazer',
  'outros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'Household', required: true, index: true })
  householdId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  description: string;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true, enum: EXPENSE_CATEGORIES })
  category: ExpenseCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  paidBy: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 1, default: 0.5 })
  splitRatio: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: null })
  receiptUrl?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
