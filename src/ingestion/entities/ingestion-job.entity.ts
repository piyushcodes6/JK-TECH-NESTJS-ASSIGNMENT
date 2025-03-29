import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsEnum, IsOptional, IsString, IsUUID, IsObject, Min, Max, IsNotEmpty } from 'class-validator';
import { Document } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

export enum IngestionJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('ingestion_jobs')
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: IngestionJobStatus,
    default: IngestionJobStatus.PENDING
  })
  @IsEnum(IngestionJobStatus)
  status: IngestionJobStatus;

  @Column({ name: 'document_id' })
  @IsUUID()
  @IsNotEmpty()
  @Index()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'created_by_id' })
  @IsUUID()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date;

  @Column({ default: 0 })
  @Min(0)
  @Max(10)
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @IsObject()
  @IsOptional()
  results: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  error: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
