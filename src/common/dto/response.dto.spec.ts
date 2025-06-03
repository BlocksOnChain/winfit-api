import { ApiResponseDto } from './response.dto';

describe('ApiResponseDto', () => {
  describe('constructor', () => {
    it('should create a successful response with data and message', () => {
      const data = { id: 1, name: 'test' };
      const message = 'Success message';
      const response = new ApiResponseDto(true, data, message);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
      expect(response.error).toBeUndefined();
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    it('should create an error response with error object', () => {
      const error = { code: 'ERR001', message: 'Error message', details: 'Additional details' };
      const response = new ApiResponseDto(false, undefined, undefined, error);

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.message).toBeUndefined();
      expect(response.error).toEqual(error);
      expect(response.timestamp).toBeDefined();
    });

    it('should create response with minimal parameters', () => {
      const response = new ApiResponseDto(true);

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.message).toBeUndefined();
      expect(response.error).toBeUndefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should have valid ISO timestamp format', () => {
      const response = new ApiResponseDto(true);
      const timestamp = response.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('static success method', () => {
    it('should create successful response with data and message', () => {
      const data = { userId: '123', email: 'test@example.com' };
      const message = 'User retrieved successfully';
      const response = ApiResponseDto.success(data, message);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
      expect(response.error).toBeUndefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should create successful response with only data', () => {
      const data = ['item1', 'item2', 'item3'];
      const response = ApiResponseDto.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBeUndefined();
      expect(response.error).toBeUndefined();
    });

    it('should create successful response with only message', () => {
      const message = 'Operation completed successfully';
      const response = ApiResponseDto.success(undefined, message);

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.message).toBe(message);
      expect(response.error).toBeUndefined();
    });

    it('should create successful response with no parameters', () => {
      const response = ApiResponseDto.success();

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.message).toBeUndefined();
      expect(response.error).toBeUndefined();
    });

    it('should handle null data gracefully', () => {
      const response = ApiResponseDto.success(null);

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    it('should handle complex nested data structures', () => {
      const complexData = {
        user: {
          id: '123',
          profile: {
            name: 'John Doe',
            preferences: ['pref1', 'pref2'],
            metadata: {
              lastLogin: new Date(),
              settings: { theme: 'dark' }
            }
          }
        },
        permissions: ['read', 'write']
      };

      const response = ApiResponseDto.success(complexData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(complexData);
    });
  });

  describe('static error method', () => {
    it('should create error response with code and message', () => {
      const code = 'USER_NOT_FOUND';
      const message = 'The requested user was not found';
      const response = ApiResponseDto.error(code, message);

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.message).toBeUndefined();
      expect(response.error).toEqual({
        code,
        message,
        details: undefined
      });
    });

    it('should create error response with code, message, and details', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Request validation failed';
      const details = {
        field: 'email',
        reason: 'Invalid email format',
        value: 'invalid-email'
      };
      const response = ApiResponseDto.error(code, message, details);

      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code,
        message,
        details
      });
    });

    it('should handle empty strings for code and message', () => {
      const response = ApiResponseDto.error('', '');

      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: '',
        message: '',
        details: undefined
      });
    });

    it('should handle null and undefined details', () => {
      const response1 = ApiResponseDto.error('CODE', 'Message', null);
      const response2 = ApiResponseDto.error('CODE', 'Message', undefined);

      expect(response1.error?.details).toBeNull();
      expect(response2.error?.details).toBeUndefined();
    });

    it('should handle complex error details', () => {
      const details = {
        errors: [
          { field: 'username', message: 'Username is required' },
          { field: 'password', message: 'Password too weak' }
        ],
        timestamp: new Date(),
        requestId: '12345'
      };

      const response = ApiResponseDto.error('MULTIPLE_ERRORS', 'Multiple validation errors', details);

      expect(response.error?.details).toEqual(details);
    });
  });

  describe('timestamp consistency', () => {
    it('should generate timestamps close to current time', () => {
      const beforeTime = Date.now();
      const response = ApiResponseDto.success();
      const afterTime = Date.now();
      const responseTime = new Date(response.timestamp).getTime();

      expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTime).toBeLessThanOrEqual(afterTime);
    });

    it('should generate different timestamps for consecutive calls', (done) => {
      const response1 = ApiResponseDto.success();
      
      setTimeout(() => {
        const response2 = ApiResponseDto.success();
        expect(response1.timestamp).not.toBe(response2.timestamp);
        done();
      }, 1);
    });
  });

  describe('type safety and generics', () => {
    it('should maintain typed data with generics', () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const userData: User = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = ApiResponseDto.success<User>(userData);

      expect(response.data).toEqual(userData);
      expect(response.data?.id).toBe('123');
      expect(response.data?.name).toBe('John Doe');
      expect(response.data?.email).toBe('john@example.com');
    });

    it('should handle array types correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const response = ApiResponseDto.success<number[]>(numbers);

      expect(response.data).toEqual(numbers);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data?.length).toBe(5);
    });
  });
}); 