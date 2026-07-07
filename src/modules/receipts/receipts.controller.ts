import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_FILE_SIZE_BYTES,
  RECEIPT_MULTER_HARD_LIMIT_BYTES,
} from './receipts.constants';
import { ReceiptsService } from './receipts.service';

@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: RECEIPT_MULTER_HARD_LIMIT_BYTES },
    }),
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: RECEIPT_MAX_FILE_SIZE_BYTES }),
          new FileTypeValidator({
            fileType: new RegExp(RECEIPT_ALLOWED_MIME_TYPES.join('|')),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() createReceiptDto: CreateReceiptDto,
  ) {
    return this.receiptsService.create(user, file, createReceiptDto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReceiptQueryDto,
  ) {
    return this.receiptsService.findAll(user, query);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.receiptsService.remove(user, id);
  }
}
