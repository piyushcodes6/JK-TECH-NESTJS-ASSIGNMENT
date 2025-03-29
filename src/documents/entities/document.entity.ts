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
import { IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { User } from '../../users/entities/user.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed'
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @Index()
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description: string;

  @Column()
  @IsNotEmpty()
  filePath: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING
  })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  @IsOptional()
  assignedTo: User;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsObject()
  @IsOptional()
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

