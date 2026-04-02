import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { ShoppingService } from './shopping.service';

@UseGuards(JwtAuthGuard)
@Controller('shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.findAll(user);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createShoppingItemDto: CreateShoppingItemDto,
  ) {
    return this.shoppingService.create(user, createShoppingItemDto);
  }

  // This static route must come before ':id' so Nest does not treat 'checked' as a param id.
  @Delete('checked')
  async removeChecked(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.removeChecked(user);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateShoppingItemDto: UpdateShoppingItemDto,
  ) {
    return this.shoppingService.update(user, id, updateShoppingItemDto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shoppingService.remove(user, id);
  }
}
