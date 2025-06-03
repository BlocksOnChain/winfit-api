import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address - must be unique and valid format',
    type: String,
    format: 'email',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'fitness_user123',
    description: 'Unique username for the user (3-20 characters, alphanumeric)',
    minLength: 3,
    maxLength: 20,
    type: String,
    pattern: '^[a-zA-Z0-9_]+$',
    required: true,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
  username: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Strong password (minimum 8 characters, include uppercase, lowercase, number)',
    minLength: 8,
    type: String,
    format: 'password',
    required: true,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    maxLength: 100,
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    maxLength: 100,
    type: String,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth in ISO format (YYYY-MM-DD) - optional for registration',
    type: String,
    format: 'date',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date in ISO format' })
  dateOfBirth?: string;

  @ApiProperty({
    example: 'Male',
    description: 'User gender - used for fitness calculations and achievements',
    enum: ['Male', 'Female', 'Other'],
    type: String,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'], { message: 'Gender must be Male, Female, or Other' })
  gender?: string;

  @ApiProperty({
    example: 175,
    description: 'User height in centimeters (100-250 cm) - used for calorie calculations',
    minimum: 100,
    maximum: 250,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(100, { message: 'Height must be at least 100 cm' })
  @Max(250, { message: 'Height cannot exceed 250 cm' })
  heightCm?: number;

  @ApiProperty({
    example: 70.5,
    description: 'User weight in kilograms (30-300 kg) - used for calorie calculations',
    minimum: 30,
    maximum: 300,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(30, { message: 'Weight must be at least 30 kg' })
  @Max(300, { message: 'Weight cannot exceed 300 kg' })
  weightKg?: number;
}
