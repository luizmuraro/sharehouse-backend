import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ShoppingItemDocument = HydratedDocument<ShoppingItem>;

@Schema({ timestamps: true })
export class ShoppingItem {
  @Prop({ type: Types.ObjectId, ref: 'Household', required: true, index: true })
  householdId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ required: true, trim: true, maxlength: 20, default: 'un' })
  unit: string;

  @Prop({ required: true, default: false })
  checked: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ShoppingItemSchema = SchemaFactory.createForClass(ShoppingItem);
