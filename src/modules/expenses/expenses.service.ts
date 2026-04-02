import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/types';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

type ExpenseResponse = {
  id: string;
  householdId: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  splitRatio: number;
  date: Date;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SummaryMember = {
  id: string;
  name: string;
  balanceCents: number;
};

type SummaryTransfer = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

type ExpensesSummaryResponse = {
  householdId: string;
  members: SummaryMember[];
  transfer: SummaryTransfer | null;
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createExpenseDto: CreateExpenseDto,
  ): Promise<ExpenseResponse> {
    const householdId = this.getHouseholdId(user);
    await this.ensureUserInHousehold(createExpenseDto.paidBy, householdId);
    this.validateSplitRatio(createExpenseDto.splitRatio);

    const createdExpense = await this.expenseModel.create({
      householdId: new Types.ObjectId(householdId),
      description: createExpenseDto.description,
      amount: createExpenseDto.amount,
      category: createExpenseDto.category,
      paidBy: new Types.ObjectId(createExpenseDto.paidBy),
      splitRatio: createExpenseDto.splitRatio,
      date: new Date(createExpenseDto.date),
      receiptUrl: createExpenseDto.receiptUrl ?? null,
    });

    return this.serializeExpense(createdExpense);
  }

  async findAll(
    user: AuthenticatedUser,
    query: ExpenseQueryDto,
  ): Promise<ExpenseResponse[]> {
    const householdId = this.getHouseholdId(user);
    const filters: Record<string, unknown> = {
      householdId: new Types.ObjectId(householdId),
    };

    if (query.category) {
      filters.category = query.category;
    }

    if (query.paidBy) {
      await this.ensureUserInHousehold(query.paidBy, householdId);
      filters.paidBy = new Types.ObjectId(query.paidBy);
    }

    if (query.month) {
      const year = query.year ?? new Date().getUTCFullYear();
      const start = new Date(Date.UTC(year, query.month - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, query.month, 1, 0, 0, 0, 0));
      filters.date = { $gte: start, $lt: end };
    }

    const expenses = await this.expenseModel
      .find(filters)
      .sort({ date: -1, createdAt: -1 })
      .exec();

    return expenses.map((expense) => this.serializeExpense(expense));
  }

  async findOne(user: AuthenticatedUser, expenseId: string): Promise<ExpenseResponse> {
    const householdId = this.getHouseholdId(user);
    const expense = await this.findExpenseByIdInHousehold(expenseId, householdId);

    return this.serializeExpense(expense);
  }

  async update(
    user: AuthenticatedUser,
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    const householdId = this.getHouseholdId(user);
    const expense = await this.findExpenseByIdInHousehold(expenseId, householdId);

    if (typeof updateExpenseDto.paidBy === 'string') {
      await this.ensureUserInHousehold(updateExpenseDto.paidBy, householdId);
      expense.paidBy = new Types.ObjectId(updateExpenseDto.paidBy);
    }

    if (typeof updateExpenseDto.splitRatio === 'number') {
      this.validateSplitRatio(updateExpenseDto.splitRatio);
      expense.splitRatio = updateExpenseDto.splitRatio;
    }

    if (typeof updateExpenseDto.description === 'string') {
      expense.description = updateExpenseDto.description;
    }

    if (typeof updateExpenseDto.amount === 'number') {
      expense.amount = updateExpenseDto.amount;
    }

    if (typeof updateExpenseDto.category === 'string') {
      expense.category = updateExpenseDto.category;
    }

    if (typeof updateExpenseDto.date === 'string') {
      expense.date = new Date(updateExpenseDto.date);
    }

    if (typeof updateExpenseDto.receiptUrl === 'string') {
      expense.receiptUrl = updateExpenseDto.receiptUrl;
    }

    await expense.save();

    return this.serializeExpense(expense);
  }

  async remove(user: AuthenticatedUser, expenseId: string): Promise<{ deleted: true }> {
    const householdId = this.getHouseholdId(user);
    const expense = await this.findExpenseByIdInHousehold(expenseId, householdId);

    await expense.deleteOne();

    return { deleted: true };
  }

  async summary(user: AuthenticatedUser): Promise<ExpensesSummaryResponse> {
    const householdId = this.getHouseholdId(user);
    const members = await this.userModel
      .find({ householdId: new Types.ObjectId(householdId) })
      .sort({ createdAt: 1 })
      .exec();

    if (members.length === 0) {
      throw new NotFoundException('No household members found');
    }

    const memberIds = members.map((member) => member._id.toString());
    const balances = new Map<string, number>(memberIds.map((memberId) => [memberId, 0]));

    const expenses = await this.expenseModel
      .find({ householdId: new Types.ObjectId(householdId) })
      .exec();

    for (const expense of expenses) {
      const paidBy = expense.paidBy.toString();
      const payerIndex = memberIds.indexOf(paidBy);

      if (payerIndex === -1 || memberIds.length < 2) {
        continue;
      }

      const payerShare = Math.round(expense.amount * expense.splitRatio);
      const otherShare = expense.amount - payerShare;
      const otherMember = memberIds.find((memberId) => memberId !== paidBy);

      if (!otherMember) {
        continue;
      }

      balances.set(paidBy, (balances.get(paidBy) ?? 0) + otherShare);
      balances.set(otherMember, (balances.get(otherMember) ?? 0) - otherShare);
    }

    const serializedMembers = members.map((member) => ({
      id: member._id.toString(),
      name: member.name,
      balanceCents: balances.get(member._id.toString()) ?? 0,
    }));

    let transfer: SummaryTransfer | null = null;
    if (serializedMembers.length >= 2) {
      const first = serializedMembers[0];
      const second = serializedMembers[1];

      if (first.balanceCents > 0) {
        transfer = {
          fromUserId: second.id,
          toUserId: first.id,
          amountCents: first.balanceCents,
        };
      } else if (first.balanceCents < 0) {
        transfer = {
          fromUserId: first.id,
          toUserId: second.id,
          amountCents: Math.abs(first.balanceCents),
        };
      }
    }

    return {
      householdId,
      members: serializedMembers,
      transfer,
    };
  }

  private getHouseholdId(user: AuthenticatedUser): string {
    if (!user.householdId) {
      throw new BadRequestException('User is not part of any household');
    }

    return user.householdId;
  }

  private async ensureUserInHousehold(
    userId: string,
    householdId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const found = await this.userModel
      .exists({ _id: new Types.ObjectId(userId), householdId: new Types.ObjectId(householdId) })
      .exec();

    if (!found) {
      throw new BadRequestException('paidBy must belong to the same household');
    }
  }

  private validateSplitRatio(splitRatio: number): void {
    if (splitRatio < 0 || splitRatio > 1) {
      throw new BadRequestException('splitRatio must be between 0 and 1');
    }
  }

  private async findExpenseByIdInHousehold(
    expenseId: string,
    householdId: string,
  ): Promise<ExpenseDocument> {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new BadRequestException('Invalid expense id');
    }

    const expense = await this.expenseModel
      .findOne({
        _id: new Types.ObjectId(expenseId),
        householdId: new Types.ObjectId(householdId),
      })
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private serializeExpense(expense: ExpenseDocument): ExpenseResponse {
    return {
      id: expense._id.toString(),
      householdId: expense.householdId.toString(),
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      paidBy: expense.paidBy.toString(),
      splitRatio: expense.splitRatio,
      date: expense.date,
      receiptUrl: expense.receiptUrl ?? null,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
