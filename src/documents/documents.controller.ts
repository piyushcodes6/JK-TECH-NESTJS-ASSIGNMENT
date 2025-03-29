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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// Import Express namespace for Multer types
import { Express } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DocumentStatus } from './entities/document.entity';
import { ConfigService } from '@nestjs/config';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB by default, can be configured
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = (
          process.env.ALLOWED_MIME_TYPES || 
          'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
        ).split(',');
        
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Only the following file types are allowed: ${allowedMimeTypes.join(', ')}`
            ),
            false
          );
        }
        callback(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    return this.documentsService.create(
      createDocumentDto,
      file,
      req.user.id,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: DocumentStatus,
    @Request() req,
  ) {
    // Regular users can only see their own documents
    if (req.user.role === UserRole.USER) {
      return this.documentsService.findAll(page, limit, req.user.id, status);
    }
    
    // Admins and managers can see all documents
    return this.documentsService.findAll(page, limit, undefined, status);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const document = await this.documentsService.findById(id);
    
    // Regular users can only view their own documents or documents assigned to them
    if (
      req.user.role === UserRole.USER &&
      document.createdById !== req.user.id &&
      document.assignedToId !== req.user.id
    ) {
      throw new ForbiddenException('You do not have permission to access this document');
    }
    
    return document;
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req,
  ) {
    const document = await this.documentsService.findById(id);
    
    // Regular users can only update their own documents
    if (req.user.role === UserRole.USER && document.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to update this document');
    }
    
    // Managers can only update documents they created or that are assigned to them
    if (
      req.user.role === UserRole.MANAGER && 
      document.createdById !== req.user.id &&
      document.assignedToId !== req.user.id
    ) {
      throw new ForbiddenException('You do not have permission to update this document');
    }
    
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const document = await this.documentsService.findById(id);

    // Regular users can only delete their own documents
    if (req.user.role === UserRole.USER && document.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to delete this document');
    }
    
    // Managers can only delete documents they created
    if (req.user.role === UserRole.MANAGER && document.createdById !== req.user.id) {
      throw new ForbiddenException('You do not have permission to delete this document');
    }
    
    return this.documentsService.remove(id);
  }
}

