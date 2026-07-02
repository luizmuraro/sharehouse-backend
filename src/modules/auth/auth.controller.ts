import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setAuthCookie(response, result.accessToken);

    return result.user;
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookie(response, result.accessToken);

    return result.user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.getAuthCookieOptions());

    return { loggedOut: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  private static readonly UNIT_MS: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  private setAuthCookie(response: Response, accessToken: string): void {
    const cookieOptions: CookieOptions = {
      ...this.getAuthCookieOptions(),
      maxAge: this.getCookieMaxAgeMs(),
    };

    response.cookie('access_token', accessToken, cookieOptions);
  }

  // Keep the cookie lifetime aligned with the JWT lifetime so they can't drift.
  // Supports the same forms as JWT_EXPIRES_IN (e.g. "7d", "24h", "3600"); a bare
  // number is seconds, per the jsonwebtoken convention.
  private getCookieMaxAgeMs(): number {
    const fallback = 7 * AuthController.UNIT_MS.d;
    const raw = (process.env.JWT_EXPIRES_IN ?? '7d').trim();
    const match = /^(\d+)\s*(ms|s|m|h|d|w)?$/i.exec(raw);
    if (!match) {
      return fallback;
    }

    const value = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();
    return value * (AuthController.UNIT_MS[unit] ?? AuthController.UNIT_MS.s);
  }

  private getAuthCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };
  }
}
