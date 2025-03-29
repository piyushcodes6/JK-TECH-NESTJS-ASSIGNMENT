import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { Express } from 'express';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class DocumentsService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    // Ensure upload directory exists
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async findAll(page = 1, limit = 10, userId?: string, status?: DocumentStatus) {
    const query = this.documentsRepository.createQueryBuilder('document');

    if (userId) {
      query.where('document.createdById = :userId', { userId });
    }

    if (status) {
      query.andWhere('document.status = :status', { status });
    }

    query
      .orderBy('document.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [documents, total] = await query.getManyAndCount();

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const document = await this.documentsRepository.findOne({ 
      where: { id },
      relations: ['createdBy', 'assignedTo']
    });
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    
    return document;
  }

  async create(createDocumentDto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    try {
      const user = await this.usersService.findById(userId);
      
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExt}`;
      const filePath = path.join(this.uploadDir, filename);
      
      // Ensure directory exists and save file
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.buffer);
      
      // Create document record
      // Create document record
      const document = this.documentsRepository.create({
        title: createDocumentDto.title,
        description: createDocumentDto.description,
        filePath: filename,
        createdById: userId,
        status: DocumentStatus.PENDING,
        metadata: {
          fileType: file.mimetype,
          fileSize: file.size,
          originalName: file.originalname
        }
      });
      await this.documentsRepository.save(document);
      return document;
    } catch (error) {
      throw new BadRequestException(`Failed to create document: ${error.message}`);
    }
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.findById(id);
    
    // Update document properties
    Object.assign(document, updateDocumentDto);
    
    await this.documentsRepository.save(document);
    return document;
  }

  async remove(id: string) {
    const document = await this.findById(id);
    
    // Delete the physical file
    try {
      await unlink(path.join(this.uploadDir, document.filePath));
    } catch (error) {
      // Log but don't fail if file doesn't exist
      console.error(`Error deleting file: ${error.message}`);
    }
    
    await this.documentsRepository.remove(document);
    return { id, deleted: true };
  }
}

