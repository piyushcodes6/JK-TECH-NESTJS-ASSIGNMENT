import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJob, IngestionJobStatus } from './entities/ingestion-job.entity';
import { DocumentsService } from '../documents/documents.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(IngestionJob)
    private ingestionJobRepository: Repository<IngestionJob>,
    private documentsService: DocumentsService,
    private configService: ConfigService,
    private httpService: HttpService
  ) {}

  // Alias methods to match controller calls
  async create(createJobDto: any, userId: string): Promise<IngestionJob> {
    return this.createJob(createJobDto.documentId, userId);
  }

  async findAll(page = 1, limit = 10, userId?: string): Promise<{
    data: IngestionJob[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.findAllJobs(page, limit, userId);
  }

  async findById(id: string): Promise<IngestionJob> {
    return this.findJobById(id);
  }
  async createJob(documentId: string, userId: string, options?: Record<string, any>): Promise<IngestionJob> {
    try {
      // Verify document exists
      const document = await this.documentsService.findById(documentId);
      
      const ingestionJob = this.ingestionJobRepository.create({
        documentId,
        createdById: userId,
        status: IngestionJobStatus.PENDING,
        result: options ? { config: options } : {}
      });
      
      await this.ingestionJobRepository.save(ingestionJob);
      
      // Attempt to start processing (non-blocking)
      this.processJob(ingestionJob.id).catch(error => {
        console.error(`Error starting ingestion job ${ingestionJob.id}:`, error);
      });
      
      return ingestionJob;
    } catch (error) {
      throw new BadRequestException(`Failed to create ingestion job: ${error.message}`);
    }
  }

  async updateJobStatus(
    id: string, 
    status: IngestionJobStatus, 
    result?: Record<string, any>, 
    errorMessage?: string
  ): Promise<IngestionJob> {
    const job = await this.findJobById(id);
    
    job.status = status;
    
    if (status === IngestionJobStatus.COMPLETED) {
      job.completedAt = new Date();
      job.result = result || {};
    } else if (status === IngestionJobStatus.FAILED) {
      job.error = errorMessage || ''; // Default to empty string
    }
    
    return this.ingestionJobRepository.save(job);
  }

  async findAllJobs(page = 1, limit = 10, userId?: string, status?: IngestionJobStatus): Promise<{
    data: IngestionJob[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = this.ingestionJobRepository.createQueryBuilder('job');
    
    if (userId) {
      query.where('job.createdById = :userId', { userId });
    }
    
    if (status) {
      query.andWhere('job.status = :status', { status });
    }
    
    query
      .leftJoinAndSelect('job.document', 'document')
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    
    const [jobs, total] = await query.getManyAndCount();
    
    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findJobById(id: string): Promise<IngestionJob> {
    const job = await this.ingestionJobRepository.findOne({ 
      where: { id },
      relations: ['document', 'createdBy'] 
    });
    
    if (!job) {
      throw new NotFoundException(`Ingestion job with ID ${id} not found`);
    }
    
    return job;
  }

  async getJobStatus(id: string): Promise<{ status: IngestionJobStatus; progress?: number }> {
    const job = await this.findJobById(id);
    return { 
      status: job.status,
      progress: job.status === IngestionJobStatus.RUNNING ? this.calculateProgress(job) : undefined
    };
  }

  // Process job by communicating with the Python backend service
  private async processJob(id: string): Promise<void> {
    try {
      const job = await this.findJobById(id);
      
      // Update to processing status
      await this.updateJobStatus(id, IngestionJobStatus.RUNNING);
      
      // Get the Python service URL from config
      const pythonServiceUrl = this.configService.get<string>('ingestion.pythonServiceUrl');
      
      // In a real implementation, we would send the document to the Python service
      // For this assignment, we'll simulate processing with a delay
      try {
        // Attempt to call Python backend (this would be a real API call in production)
        // const response = await lastValueFrom(
        //   this.httpService.post(`${pythonServiceUrl}/process`, {
        //     jobId: job.id,
        //     documentId: job.documentId,
        //     options: job.options
        //   })
        // );
        
        // Instead, simulate processing delay and success
        await this.simulateProcessing();
        
        // Update to completed status
        await this.updateJobStatus(
          id, 
          IngestionJobStatus.COMPLETED, 
          { success: true, message: 'Document processed successfully' }
        );
        
        // In a real implementation, we would also update the document status
        
      } catch (error) {
        // Handle processing error
        await this.updateJobStatus(
          id,
          IngestionJobStatus.FAILED,
          undefined,
          `Processing failed: ${error.message}`
        );
      }
    } catch (error) {
      console.error(`Error processing job ${id}:`, error);
    }
  }

  // Retry a failed job
  async retryJob(id: string): Promise<IngestionJob> {
    const job = await this.findJobById(id);
    
    if (job.status !== IngestionJobStatus.FAILED) {
      throw new BadRequestException('Only failed jobs can be retried');
    }
    
    job.retryCount = (job.retryCount || 0) + 1;
    job.status = IngestionJobStatus.QUEUED;
    job.error = ''; // Empty string instead of null
    
    await this.ingestionJobRepository.save(job);
    
    // Start processing (non-blocking)
    this.processJob(job.id).catch(error => {
      console.error(`Error retrying job ${job.id}:`, error);
    });
    
    return job;
  }

  // Cancel a running or queued job
  async cancelJob(id: string): Promise<IngestionJob> {
    const job = await this.findJobById(id);
    
    if (job.status !== IngestionJobStatus.QUEUED && job.status !== IngestionJobStatus.RUNNING) {
      throw new BadRequestException('Only queued or running jobs can be canceled');
    }
    
    // In a real implementation, we would also need to inform the Python service
    // to stop processing if the job is already running
    
    job.status = IngestionJobStatus.FAILED;
    job.error = 'Job was canceled by user';
    
    return this.ingestionJobRepository.save(job);
  }

  // Helper methods
  private async simulateProcessing(): Promise<void> {
    // Simulate processing delay (5-10 seconds)
    const processingTime = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private calculateProgress(job: IngestionJob): number {
    // In a real implementation, this would calculate actual progress
    // For this assignment, we'll return a random value between 0-100
    const startTime = job.createdAt.getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    
    // Assume processing takes approximately 10 seconds
    const progress = Math.min(100, Math.floor((elapsedTime / 10000) * 100));
    
    return progress;
  }
}

