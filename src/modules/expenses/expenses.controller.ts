import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.summary(user);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.expensesService.findAll(user, query);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user, createExpenseDto);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user, id, updateExpenseDto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.remove(user, id);
  }
}
