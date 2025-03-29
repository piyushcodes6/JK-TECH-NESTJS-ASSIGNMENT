import { IsNotEmpty, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIngestionJobDto {
  @IsNotEmpty()
  @IsUUID()
  documentId: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
