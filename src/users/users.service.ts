import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [users, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users.map(user => this.sanitizeUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to find user: ${error.message}`);
    }
  }

  async findByEmail(email: string) {
    try {
      return this.usersRepository.findOne({ where: { email } });
    } catch (error) {
      throw new BadRequestException(`Failed to find user by email: ${error.message}`);
    }
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const user = this.usersRepository.create(createUserDto);
      await this.usersRepository.save(user);
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findById(id);

      // If updating email, check if the new email is already in use
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.findByEmail(updateUserDto.email);
        if (existingUser) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Update user properties
      Object.assign(user, updateUserDto);
      
      await this.usersRepository.save(user);
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update user: ${error.message}`);
    }
  }

  async remove(id: string) {
    try {
      const user = await this.findById(id);
      await this.usersRepository.remove(user);
      return { id, deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

  async changeRole(id: string, role: UserRole) {
    try {
      const user = await this.findById(id);
      user.role = role;
      await this.usersRepository.save(user);
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to change user role: ${error.message}`);
    }
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}

