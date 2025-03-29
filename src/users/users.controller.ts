import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.usersService.findAll(page, limit);
  }

  @Get('me')
  findMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // Regular users can only view their own profile
    if (req.user.role === UserRole.USER && req.user.id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Regular users can only update their own profile and cannot change their role
    if (req.user.role === UserRole.USER) {
      if (req.user.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      
      if (updateUserDto.role) {
        throw new ForbiddenException('You cannot change your role');
      }
    }
    
    // Managers can update users but cannot change roles to ADMIN
    if (req.user.role === UserRole.MANAGER && 
        updateUserDto.role === UserRole.ADMIN) {
      throw new ForbiddenException('Managers cannot promote users to Admin role');
    }
    
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}

