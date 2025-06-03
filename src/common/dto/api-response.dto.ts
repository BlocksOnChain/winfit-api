import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty()
  timestamp?: string;

  constructor(
    success: boolean,
    data?: T,
    message?: string,
    error?: { code: string; message: string; details?: any },
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
} 