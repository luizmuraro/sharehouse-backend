import { ExpensesService } from './expenses.service';
import type { AuthenticatedUser } from '../auth/types';

// A valid 24-hex string so `new Types.ObjectId(householdId)` inside summary()
// doesn't throw (the model calls are mocked, so the value itself is inert).
const HOUSEHOLD_ID = '507f1f77bcf86cd799439011';

const user = {
  id: 'a',
  householdId: HOUSEHOLD_ID,
} as unknown as AuthenticatedUser;

type MemberDoc = { _id: string; name: string };
type ExpenseDoc = { paidBy: string; amount: number; splitRatio: number };
type SettlementDoc = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

const buildService = (
  members: MemberDoc[],
  expenses: ExpenseDoc[],
  settlements: SettlementDoc[] = [],
) => {
  const userModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(members),
      }),
    }),
  };
  const expenseModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(expenses),
    }),
  };
  const settlementModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(settlements),
    }),
  };

  return new ExpensesService(
    expenseModel as never,
    settlementModel as never,
    userModel as never,
  );
};

const ana: MemberDoc = { _id: 'a', name: 'Ana' };
const bruno: MemberDoc = { _id: 'b', name: 'Bruno' };
const balanceOf = (
  summary: Awaited<ReturnType<ExpensesService['summary']>>,
  id: string,
) => summary.members.find((member) => member.id === id)?.balanceCents;

describe('ExpensesService.summary balance math', () => {
  it('returns zero balances and no transfer for a solo household', async () => {
    const service = buildService(
      [ana],
      [{ paidBy: 'a', amount: 10000, splitRatio: 1 }],
    );

    const summary = await service.summary(user);

    expect(balanceOf(summary, 'a')).toBe(0);
    expect(summary.transfer).toBeNull();
  });

  it('splits a 50/50 expense so the non-payer owes half', async () => {
    const service = buildService(
      [ana, bruno],
      [{ paidBy: 'a', amount: 10000, splitRatio: 0.5 }],
    );

    const summary = await service.summary(user);

    expect(balanceOf(summary, 'a')).toBe(5000);
    expect(balanceOf(summary, 'b')).toBe(-5000);
    expect(summary.transfer).toEqual({
      fromUserId: 'b',
      toUserId: 'a',
      amountCents: 5000,
    });
  });

  it("treats splitRatio as the payer's share on custom splits", async () => {
    // Ana paid and keeps 30%; Bruno owes the remaining 70%.
    const service = buildService(
      [ana, bruno],
      [{ paidBy: 'a', amount: 10000, splitRatio: 0.3 }],
    );

    const summary = await service.summary(user);

    expect(balanceOf(summary, 'a')).toBe(7000);
    expect(balanceOf(summary, 'b')).toBe(-7000);
    expect(summary.transfer).toEqual({
      fromUserId: 'b',
      toUserId: 'a',
      amountCents: 7000,
    });
  });

  it('nets a full settlement back to zero', async () => {
    const service = buildService(
      [ana, bruno],
      [{ paidBy: 'a', amount: 10000, splitRatio: 0.5 }],
      [{ fromUserId: 'b', toUserId: 'a', amountCents: 5000 }],
    );

    const summary = await service.summary(user);

    expect(balanceOf(summary, 'a')).toBe(0);
    expect(balanceOf(summary, 'b')).toBe(0);
    expect(summary.transfer).toBeNull();
  });
});
