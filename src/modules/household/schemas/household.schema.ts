import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type HouseholdDocument = HydratedDocument<Household>;

@Schema({ timestamps: true })
export class Household {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    default: [],
  })
  members: Types.ObjectId[];

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6,
  })
  inviteCode: string;

  createdAt: Date;
  updatedAt: Date;
}

export const HouseholdSchema = SchemaFactory.createForClass(Household);
