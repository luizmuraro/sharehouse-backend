import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, JwtPayload } from './types';
import { User, UserDocument } from '../users/schemas/user.schema';

type AuthTokenResponse = {
  accessToken: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = registerDto.email.toLowerCase();
    const existingUser = await this.userModel
      .exists({ email: normalizedEmail })
      .exec();

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const saltRounds = this.configService.getOrThrow<number>('bcrypt.salt');
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const createdUser = await this.userModel.create({
      name: registerDto.name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const user = this.toAuthenticatedUser(createdUser);
    const token = await this.signToken({ sub: user.id, email: user.email });

    return {
      accessToken: token.accessToken,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = loginDto.email.toLowerCase();
    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select('+password')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(loginDto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sanitizedUser = this.toAuthenticatedUser(user);
    const token = await this.signToken({
      sub: sanitizedUser.id,
      email: sanitizedUser.email,
    });

    return {
      accessToken: token.accessToken,
      user: sanitizedUser,
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userModel.findById(payload.sub).exec();

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.toAuthenticatedUser(user);
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.toAuthenticatedUser(user);
  }

  private async signToken(payload: JwtPayload): Promise<AuthTokenResponse> {
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  private toAuthenticatedUser(user: UserDocument): AuthenticatedUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      householdId: user.householdId ? user.householdId.toString() : null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
