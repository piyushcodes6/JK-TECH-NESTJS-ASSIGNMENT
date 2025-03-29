import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { CreateIngestionJobDto } from './dto/create-ingestion-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { IngestionJobStatus } from './entities/ingestion-job.entity';
import { HttpModule } from '@nestjs/axios';

@Controller('ingestion')
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  async createJob(
    @Body() createJobDto: CreateIngestionJobDto,
    @Request() req,
  ) {
    return this.ingestionService.create(createJobDto, req.user.id);
  }

  @Get('jobs')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: IngestionJobStatus,
    @Request() req,
  ) {
    // Regular users can only see their own jobs
    if (req.user.role === UserRole.USER) {
      return this.ingestionService.findAll(page, limit, req.user.id);
    }
    
    // Admins and managers can see all jobs
    return this.ingestionService.findAll(page, limit);
  }

  @Get('jobs/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const job = await this.ingestionService.findById(id);
    
    // Regular users can only view their own jobs
    if (req.user.role === UserRole.USER && job.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to access this job');
    }
    
    return job;
  }

  @Get('jobs/:id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const job = await this.ingestionService.findById(id);
    
    // Regular users can only check status of their own jobs
    if (req.user.role === UserRole.USER && job.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to access this job status');
    }
    
    return {
      id: job.id,
      status: job.status,
      documentId: job.documentId,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    };
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const job = await this.ingestionService.findById(id);
    
    // Can only retry failed jobs
    if (job.status !== IngestionJobStatus.FAILED) {
      throw new BadRequestException('Only failed jobs can be retried');
    }
    
    // Regular users can only retry their own jobs
    if (req.user.role === UserRole.USER && job.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to retry this job');
    }
    
    // In a real implementation, this would call an ingestionService.retryJob method
    // For now we'll just return a mock response
    return {
      id: job.id,
      status: IngestionJobStatus.QUEUED,
      message: 'Job has been queued for retry'
    };
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async cancelJob(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const job = await this.ingestionService.findById(id);
    
    // Can only cancel jobs that are pending or running
    if (job.status !== IngestionJobStatus.QUEUED && job.status !== IngestionJobStatus.RUNNING) {
      throw new BadRequestException('Only pending or running jobs can be canceled');
    }
    
    // Regular users can only cancel their own jobs, admins and managers can cancel any job
    if (req.user.role === UserRole.USER && job.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to cancel this job');
    }
    
    // In a real implementation, this would call an ingestionService.cancelJob method
    // For now we'll just return a mock response
    return {
      id: job.id,
      status: 'CANCELED',
      message: 'Job has been canceled'
    };
  }
}

