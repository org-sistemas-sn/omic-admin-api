import {
  Controller,
  Post,
  Req,
  UseGuards,
  Res,
  Get,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { JwtRefreshTokenGuard } from '../guards/jwt-refresh-token.guard';
import { PayloadToken } from '../models/token.model';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usuarioService: UsuariosService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const user = req.user as Usuario;

    const token = this.authService.generateJWT(user);
    const refreshToken = this.authService.generateJWTRefreshToken(user);

    await this.usuarioService.setCurrentRefreshToken(refreshToken, user.id);

    res.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json(token);
  }

  @UseGuards(JwtRefreshTokenGuard)
  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const payload = req.user as PayloadToken;
    const user = await this.usuarioService.findOne(payload.sub);
    const refreshToken = req.cookies.Refresh;
    const isMatch = await this.usuarioService.refreshTokenMatches(
      refreshToken,
      user.id,
    );

    if (isMatch) {
      const accessToken = this.authService.generateJWT(user);
      res.json(accessToken);
    } else {
      throw new ForbiddenException();
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @Post('logout')
  logout(@Req() req: Request) {
    const user = req.user as PayloadToken;
    return this.usuarioService.removeRefreshToken(user.sub);
  }
}
