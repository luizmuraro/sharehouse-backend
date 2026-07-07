import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HouseholdService } from './household.service';
import type { AuthenticatedUser } from '../auth/types';

const user = { id: 'u' } as unknown as AuthenticatedUser;
const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const buildService = (overrides: {
  household?: Record<string, unknown>;
  models?: Record<string, Partial<Record<string, jest.Mock>>>;
}) => {
  const models = overrides.models ?? {};
  const householdModel = { ...models.household } as Record<string, jest.Mock>;
  const userModel = { ...models.user } as Record<string, jest.Mock>;
  const expenseModel = { ...models.expense } as Record<string, jest.Mock>;
  const settlementModel = { ...models.settlement } as Record<string, jest.Mock>;
  const shoppingItemModel = { ...models.shopping } as Record<string, jest.Mock>;

  const service = new HouseholdService(
    householdModel as never,
    userModel as never,
    expenseModel as never,
    settlementModel as never,
    shoppingItemModel as never,
  );

  return {
    service,
    householdModel,
    userModel,
    expenseModel,
    settlementModel,
    shoppingItemModel,
  };
};

describe('HouseholdService.join', () => {
  it('rejects an invalid invite code with NotFound', async () => {
    const { service } = buildService({
      models: {
        user: {
          findById: jest
            .fn()
            .mockReturnValue(execOf({ _id: 'u', householdId: null })),
        },
        household: { findOne: jest.fn().mockReturnValue(execOf(null)) },
      },
    });

    await expect(
      service.join(user, { inviteCode: 'ABCDEF' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enforces the 2-member cap: a full household rejects the join with Conflict', async () => {
    // The atomic guarded update returns null when the household no longer has
    // exactly one member (i.e. it is already full).
    const { service } = buildService({
      models: {
        user: {
          findById: jest
            .fn()
            .mockReturnValue(execOf({ _id: 'u', householdId: null })),
        },
        household: {
          findOne: jest.fn().mockReturnValue(execOf({ _id: 'h' })),
          findOneAndUpdate: jest.fn().mockReturnValue(execOf(null)),
        },
      },
    });

    await expect(
      service.join(user, { inviteCode: 'ABCDEF' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('HouseholdService.leave', () => {
  it('rejects when the user is not in a household', async () => {
    const { service } = buildService({
      models: {
        user: {
          findById: jest
            .fn()
            .mockReturnValue(execOf({ _id: 'u', householdId: null })),
        },
      },
    });

    await expect(service.leave(user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cascade-deletes the household and its data when the last member leaves', async () => {
    const userDoc = {
      _id: 'u',
      householdId: 'h1',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const {
      service,
      householdModel,
      expenseModel,
      settlementModel,
      shoppingItemModel,
    } = buildService({
      models: {
        user: { findById: jest.fn().mockReturnValue(execOf(userDoc)) },
        household: {
          updateOne: jest.fn().mockReturnValue(execOf(undefined)),
          findById: jest.fn().mockReturnValue(execOf({ members: [] })),
          deleteOne: jest.fn().mockReturnValue(execOf(undefined)),
        },
        expense: { deleteMany: jest.fn().mockReturnValue(execOf(undefined)) },
        settlement: {
          deleteMany: jest.fn().mockReturnValue(execOf(undefined)),
        },
        shopping: { deleteMany: jest.fn().mockReturnValue(execOf(undefined)) },
      },
    });

    await expect(service.leave(user)).resolves.toEqual({ left: true });
    expect(userDoc.householdId).toBeNull();
    expect(householdModel.deleteOne).toHaveBeenCalled();
    expect(expenseModel.deleteMany).toHaveBeenCalledWith({ householdId: 'h1' });
    expect(settlementModel.deleteMany).toHaveBeenCalledWith({
      householdId: 'h1',
    });
    expect(shoppingItemModel.deleteMany).toHaveBeenCalledWith({
      householdId: 'h1',
    });
  });
});
