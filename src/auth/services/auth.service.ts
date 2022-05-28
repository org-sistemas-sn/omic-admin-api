import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { PayloadToken } from '../models/token.model';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import config from 'src/config';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usuariosService.findByEmail(email);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        delete user.password;
        return user;
      }
    }
    return null;
  }

  generateJWT(user: Usuario) {
    const payload: PayloadToken = {
      sub: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  generateJWTRefreshToken(user: Usuario) {
    const payload: PayloadToken = {
      sub: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '1d',
      secret: this.configService.jwtRefreshSecret,
    });
  }
}
