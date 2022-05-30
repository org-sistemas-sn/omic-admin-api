import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';

import config from 'src/config';
import { PayloadToken } from '../models/token.model';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          console.log(request.cookies);

          return request?.cookies?.Refresh;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwtRefreshSecret,
    });
  }

  async validate(payload: PayloadToken) {
    return payload;
  }
}
