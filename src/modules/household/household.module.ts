import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import {
  Settlement,
  SettlementSchema,
} from '../expenses/schemas/settlement.schema';
import {
  ShoppingItem,
  ShoppingItemSchema,
} from '../shopping/schemas/shopping-item.schema';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { Household, HouseholdSchema } from './schemas/household.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Household.name, schema: HouseholdSchema },
      { name: User.name, schema: UserSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Settlement.name, schema: SettlementSchema },
      { name: ShoppingItem.name, schema: ShoppingItemSchema },
    ]),
  ],
  controllers: [HouseholdController],
  providers: [HouseholdService],
})
export class HouseholdModule {}
