import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { Household, HouseholdSchema } from './schemas/household.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Household.name, schema: HouseholdSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HouseholdController],
  providers: [HouseholdService],
})
export class HouseholdModule {}
