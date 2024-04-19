import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from '../entities/usuario.entity';
import { CreateUserDto, UpdateUserDto } from '../dtos/usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {}

  async create(data: CreateUserDto) {
    const user = await this.findByEmail(data.email);
    if (user) {
      throw new BadRequestException();
    }
    const newUser = this.usuarioRepo.create(data);
    const hash = await bcrypt.hash(data.password, 10);
    newUser.password = hash;
    return this.usuarioRepo.save(newUser);
  }

  async update(id: number, changes: UpdateUserDto) {
    const user = await this.usuarioRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException();
    }
    this.usuarioRepo.merge(user, changes);
    return this.usuarioRepo.save(user);
  }

  async findOne(id: number) {
    const user = await this.usuarioRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  findAll() {
    return this.usuarioRepo.find();
  }

  findByEmail(email: string) {
    return this.usuarioRepo.findOne({ where: { email } });
  }

  async refreshTokenMatches(refreshToken: string, id: number) {
    const user = await this.findOne(id);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    return isRefreshTokenMatching;
  }

  async setCurrentRefreshToken(refreshToken: string, id: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return this.usuarioRepo.update(id, {
      refreshToken: currentHashedRefreshToken,
    });
  }

  removeRefreshToken(id: number) {
    return this.usuarioRepo.update(id, {
      refreshToken: null,
    });
  }
}
