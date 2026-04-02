import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { AuthenticatedUser } from '../auth/types';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { Household, HouseholdDocument } from './schemas/household.schema';

type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type HouseholdResponse = {
  id: string;
  name: string;
  inviteCode: string;
  members: HouseholdMember[];
  createdAt: Date;
};

@Injectable()
export class HouseholdService {
  constructor(
    @InjectModel(Household.name)
    private readonly householdModel: Model<HouseholdDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createHouseholdDto: CreateHouseholdDto,
  ): Promise<HouseholdResponse> {
    const userDoc = await this.findUserById(user.id);

    if (userDoc.householdId) {
      throw new BadRequestException('User already belongs to a household');
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const household = await this.householdModel.create({
      name: createHouseholdDto.name,
      inviteCode,
      members: [userDoc._id],
    });

    userDoc.householdId = household._id as Types.ObjectId;
    await userDoc.save();

    return this.serializeHousehold(household, [userDoc]);
  }

  async generateInviteCode(user: AuthenticatedUser): Promise<{ inviteCode: string }> {
    const userDoc = await this.findUserById(user.id);

    if (!userDoc.householdId) {
      throw new BadRequestException('User is not part of any household');
    }

    const household = await this.householdModel.findById(userDoc.householdId).exec();
    if (!household) {
      throw new NotFoundException('Household not found');
    }

    household.inviteCode = await this.generateUniqueInviteCode();
    await household.save();

    return { inviteCode: household.inviteCode };
  }

  async join(
    user: AuthenticatedUser,
    joinHouseholdDto: JoinHouseholdDto,
  ): Promise<HouseholdResponse> {
    const userDoc = await this.findUserById(user.id);

    if (userDoc.householdId) {
      throw new BadRequestException('User already belongs to a household');
    }

    const inviteCode = joinHouseholdDto.inviteCode.toUpperCase();
    const household = await this.householdModel.findOne({ inviteCode }).exec();

    if (!household) {
      throw new NotFoundException('Invalid invite code');
    }

    if (household.members.length >= 2) {
      throw new ConflictException('Household already has two members');
    }

    household.members.push(userDoc._id as Types.ObjectId);
    await household.save();

    userDoc.householdId = household._id as Types.ObjectId;
    await userDoc.save();

    const members = await this.userModel
      .find({ _id: { $in: household.members } })
      .exec();

    return this.serializeHousehold(household, members);
  }

  private async findUserById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // Base36 gives A-Z0-9 after uppercasing and slicing.
      const candidate = randomBytes(8)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6);

      if (candidate.length !== 6) {
        continue;
      }

      const exists = await this.householdModel.exists({ inviteCode: candidate }).exec();
      if (!exists) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique invite code');
  }

  private serializeHousehold(
    household: HouseholdDocument,
    members: UserDocument[],
  ): HouseholdResponse {
    return {
      id: household._id.toString(),
      name: household.name,
      inviteCode: household.inviteCode,
      members: members.map((member) => ({
        id: member._id.toString(),
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl ?? null,
      })),
      createdAt: household.createdAt,
    };
  }
}
