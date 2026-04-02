import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/types';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { ShoppingItem, ShoppingItemDocument } from './schemas/shopping-item.schema';

type ShoppingItemResponse = {
  id: string;
  householdId: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ShoppingService {
  constructor(
    @InjectModel(ShoppingItem.name)
    private readonly shoppingItemModel: Model<ShoppingItemDocument>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createShoppingItemDto: CreateShoppingItemDto,
  ): Promise<ShoppingItemResponse> {
    const householdId = this.getHouseholdId(user);

    const createdItem = await this.shoppingItemModel.create({
      householdId: new Types.ObjectId(householdId),
      name: createShoppingItemDto.name,
      quantity: createShoppingItemDto.quantity ?? 1,
      unit: createShoppingItemDto.unit ?? 'un',
      checked: false,
      addedBy: new Types.ObjectId(user.id),
    });

    return this.serializeItem(createdItem);
  }

  async findAll(user: AuthenticatedUser): Promise<ShoppingItemResponse[]> {
    const householdId = this.getHouseholdId(user);

    const items = await this.shoppingItemModel
      .find({ householdId: new Types.ObjectId(householdId) })
      .sort({ checked: 1, createdAt: -1 })
      .exec();

    return items.map((item) => this.serializeItem(item));
  }

  async update(
    user: AuthenticatedUser,
    itemId: string,
    updateShoppingItemDto: UpdateShoppingItemDto,
  ): Promise<ShoppingItemResponse> {
    const householdId = this.getHouseholdId(user);
    const item = await this.findItemByIdInHousehold(itemId, householdId);

    if (typeof updateShoppingItemDto.name === 'string') {
      item.name = updateShoppingItemDto.name;
    }

    if (typeof updateShoppingItemDto.quantity === 'number') {
      item.quantity = updateShoppingItemDto.quantity;
    }

    if (typeof updateShoppingItemDto.unit === 'string') {
      item.unit = updateShoppingItemDto.unit;
    }

    if (typeof updateShoppingItemDto.checked === 'boolean') {
      item.checked = updateShoppingItemDto.checked;
    }

    await item.save();

    return this.serializeItem(item);
  }

  async remove(user: AuthenticatedUser, itemId: string): Promise<{ deleted: true }> {
    const householdId = this.getHouseholdId(user);
    const item = await this.findItemByIdInHousehold(itemId, householdId);

    await item.deleteOne();

    return { deleted: true };
  }

  async removeChecked(user: AuthenticatedUser): Promise<{ deletedCount: number }> {
    const householdId = this.getHouseholdId(user);

    const result = await this.shoppingItemModel
      .deleteMany({
        householdId: new Types.ObjectId(householdId),
        checked: true,
      })
      .exec();

    return { deletedCount: result.deletedCount ?? 0 };
  }

  private getHouseholdId(user: AuthenticatedUser): string {
    if (!user.householdId) {
      throw new BadRequestException('User is not part of any household');
    }

    return user.householdId;
  }

  private async findItemByIdInHousehold(
    itemId: string,
    householdId: string,
  ): Promise<ShoppingItemDocument> {
    if (!Types.ObjectId.isValid(itemId)) {
      throw new BadRequestException('Invalid shopping item id');
    }

    const item = await this.shoppingItemModel
      .findOne({
        _id: new Types.ObjectId(itemId),
        householdId: new Types.ObjectId(householdId),
      })
      .exec();

    if (!item) {
      throw new NotFoundException('Shopping item not found');
    }

    return item;
  }

  private serializeItem(item: ShoppingItemDocument): ShoppingItemResponse {
    return {
      id: item._id.toString(),
      householdId: item.householdId.toString(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: item.checked,
      addedBy: item.addedBy.toString(),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
