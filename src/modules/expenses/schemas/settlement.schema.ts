import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type SettlementDocument = HydratedDocument<Settlement>;

/**
 * A recorded payment that settles (part of) a household balance. `fromUserId`
 * is the debtor who paid; `toUserId` is the creditor who received. The summary
 * nets these against the expense-derived balances so debts can actually clear.
 */
@Schema({ timestamps: true })
export class Settlement {
  @Prop({ type: Types.ObjectId, ref: 'Household', required: true, index: true })
  householdId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amountCents: number;

  createdAt: Date;
  updatedAt: Date;
}

export const SettlementSchema = SchemaFactory.createForClass(Settlement);
