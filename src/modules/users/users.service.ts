import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/types';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

type UserProfileResponse = {
  id: string;
  name: string;
  email: string;
  householdId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async me(user: AuthenticatedUser): Promise<UserProfileResponse> {
    const userDoc = await this.userModel.findById(user.id).exec();

    if (!userDoc) {
      throw new NotFoundException('User not found');
    }

    return this.serializeUser(userDoc);
  }

  async updateMe(
    user: AuthenticatedUser,
    updateUserDto: UpdateUserDto,
  ): Promise<UserProfileResponse> {
    const userDoc = await this.userModel.findById(user.id).exec();

    if (!userDoc) {
      throw new NotFoundException('User not found');
    }

    if (typeof updateUserDto.name === 'string') {
      userDoc.name = updateUserDto.name;
    }

    if (typeof updateUserDto.avatarUrl === 'string') {
      userDoc.avatarUrl = updateUserDto.avatarUrl;
    }

    await userDoc.save();

    return this.serializeUser(userDoc);
  }

  private serializeUser(user: UserDocument): UserProfileResponse {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      householdId: user.householdId ? user.householdId.toString() : null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
