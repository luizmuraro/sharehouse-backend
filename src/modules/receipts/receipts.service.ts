import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/types';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { R2StorageService } from './r2-storage.service';
import {
  Receipt,
  ReceiptDocument,
  ReceiptFileType,
} from './schemas/receipt.schema';

type ReceiptResponse = {
  id: string;
  householdId: string;
  uploadedBy: string;
  title: string;
  amount: number | null;
  category: string;
  date: Date;
  linkedExpenseId: string | null;
  fileType: ReceiptFileType;
  mimeType: string;
  fileUrl: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectModel(Receipt.name)
    private readonly receiptModel: Model<ReceiptDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    private readonly r2Storage: R2StorageService,
  ) {}

  async create(
    user: AuthenticatedUser,
    file: Express.Multer.File,
    dto: CreateReceiptDto,
  ): Promise<ReceiptResponse> {
    const householdId = this.getHouseholdId(user);

    if (dto.linkedExpenseId) {
      await this.ensureExpenseInHousehold(dto.linkedExpenseId, householdId);
    }

    const fileType: ReceiptFileType = file.mimetype.startsWith('image/')
      ? 'image'
      : 'pdf';
    const extension = MIME_TO_EXTENSION[file.mimetype] ?? 'bin';
    const fileKey = `${householdId}/${randomUUID()}.${extension}`;
    const fileUrl = await this.r2Storage.putObject(
      fileKey,
      file.buffer,
      file.mimetype,
    );

    const title = dto.title ?? file.originalname.replace(/\.[^/.]+$/, '');
    const date = dto.date ? new Date(dto.date) : new Date();

    const createdReceipt = await this.receiptModel.create({
      householdId: new Types.ObjectId(householdId),
      uploadedBy: new Types.ObjectId(user.id),
      title,
      amount: dto.amount ?? null,
      category: dto.category ?? 'outros',
      date,
      linkedExpenseId: dto.linkedExpenseId
        ? new Types.ObjectId(dto.linkedExpenseId)
        : null,
      fileType,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      fileKey,
      fileUrl,
    });

    return this.serializeReceipt(createdReceipt);
  }

  async findAll(
    user: AuthenticatedUser,
    query: ReceiptQueryDto,
  ): Promise<ReceiptResponse[]> {
    const householdId = this.getHouseholdId(user);
    const filters: Record<string, unknown> = {
      householdId: new Types.ObjectId(householdId),
    };

    if (query.category) {
      filters.category = query.category;
    }

    if (query.linkedExpenseId) {
      filters.linkedExpenseId = new Types.ObjectId(query.linkedExpenseId);
    }

    const receipts = await this.receiptModel
      .find(filters)
      .sort({ date: -1, createdAt: -1 })
      .exec();

    return receipts.map((receipt) => this.serializeReceipt(receipt));
  }

  async remove(
    user: AuthenticatedUser,
    receiptId: string,
  ): Promise<{ deleted: true }> {
    const householdId = this.getHouseholdId(user);
    const receipt = await this.findReceiptByIdInHousehold(
      receiptId,
      householdId,
    );

    try {
      await this.r2Storage.deleteObject(receipt.fileKey);
    } catch (error) {
      // An orphaned R2 object is a cheap, acceptable cost compared to leaving
      // the user with a receipt they can never delete.
      this.logger.error(
        `Failed to delete R2 object ${receipt.fileKey} for receipt ${receiptId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    await receipt.deleteOne();

    return { deleted: true };
  }

  private getHouseholdId(user: AuthenticatedUser): string {
    if (!user.householdId) {
      throw new BadRequestException('User is not part of any household');
    }

    return user.householdId;
  }

  private async ensureExpenseInHousehold(
    expenseId: string,
    householdId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new BadRequestException('Invalid expense id');
    }

    const found = await this.expenseModel
      .exists({
        _id: new Types.ObjectId(expenseId),
        householdId: new Types.ObjectId(householdId),
      })
      .exec();

    if (!found) {
      throw new BadRequestException(
        'linkedExpenseId must belong to the same household',
      );
    }
  }

  private async findReceiptByIdInHousehold(
    receiptId: string,
    householdId: string,
  ): Promise<ReceiptDocument> {
    if (!Types.ObjectId.isValid(receiptId)) {
      throw new BadRequestException('Invalid receipt id');
    }

    const receipt = await this.receiptModel
      .findOne({
        _id: new Types.ObjectId(receiptId),
        householdId: new Types.ObjectId(householdId),
      })
      .exec();

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }

  private serializeReceipt(receipt: ReceiptDocument): ReceiptResponse {
    return {
      id: receipt._id.toString(),
      householdId: receipt.householdId.toString(),
      uploadedBy: receipt.uploadedBy.toString(),
      title: receipt.title,
      amount: receipt.amount ?? null,
      category: receipt.category,
      date: receipt.date,
      linkedExpenseId: receipt.linkedExpenseId
        ? receipt.linkedExpenseId.toString()
        : null,
      fileType: receipt.fileType,
      mimeType: receipt.mimeType,
      fileUrl: receipt.fileUrl,
      sizeBytes: receipt.sizeBytes,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    };
  }
}
