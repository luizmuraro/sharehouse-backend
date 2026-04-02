import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { HouseholdService } from './household.service';

@UseGuards(JwtAuthGuard)
@Controller('household')
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createHouseholdDto: CreateHouseholdDto,
  ) {
    return this.householdService.create(user, createHouseholdDto);
  }

  @Post('invite')
  async generateInviteCode(@CurrentUser() user: AuthenticatedUser) {
    return this.householdService.generateInviteCode(user);
  }

  @Post('join')
  async join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() joinHouseholdDto: JoinHouseholdDto,
  ) {
    return this.householdService.join(user, joinHouseholdDto);
  }
}
