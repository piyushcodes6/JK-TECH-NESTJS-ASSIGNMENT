import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    console.log(loginDto);
    
    const user = await this.validateUser(loginDto.email, loginDto.password);
    console.log(`UserData::`,user);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create(registerDto);
    
    return this.generateTokens(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Remove password from user object
      const { password, ...result } = user;
      
      return this.generateTokens(result);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: any) {
    const payload = { 
      sub: user.id,
      email: user.email,
      role: user.role 
    };
    
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn')
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d'
      }),
      user
    };
  }
}

