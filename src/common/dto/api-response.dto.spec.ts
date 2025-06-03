import { ApiResponseDto } from './api-response.dto';

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
      expect(new Date(response.timestamp!)).toBeInstanceOf(Date);
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
      const timestamp = response.timestamp!;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should handle null data gracefully', () => {
      const response = new ApiResponseDto(true, null);

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

      const response = new ApiResponseDto(true, complexData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(complexData);
    });

    it('should handle error with all properties', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          field: 'email',
          reason: 'Invalid email format',
          value: 'invalid-email'
        }
      };
      const response = new ApiResponseDto(false, undefined, undefined, error);

      expect(response.success).toBe(false);
      expect(response.error).toEqual(error);
    });

    it('should handle empty strings for message', () => {
      const response = new ApiResponseDto(true, undefined, '');

      expect(response.success).toBe(true);
      expect(response.message).toBe('');
    });
  });

  describe('timestamp consistency', () => {
    it('should generate timestamps close to current time', () => {
      const beforeTime = Date.now();
      const response = new ApiResponseDto(true);
      const afterTime = Date.now();
      const responseTime = new Date(response.timestamp!).getTime();

      expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTime).toBeLessThanOrEqual(afterTime);
    });

    it('should generate different timestamps for consecutive calls', (done) => {
      const response1 = new ApiResponseDto(true);
      
      setTimeout(() => {
        const response2 = new ApiResponseDto(true);
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

      const response = new ApiResponseDto<User>(true, userData);

      expect(response.data).toEqual(userData);
      expect(response.data?.id).toBe('123');
      expect(response.data?.name).toBe('John Doe');
      expect(response.data?.email).toBe('john@example.com');
    });

    it('should handle array types correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const response = new ApiResponseDto<number[]>(true, numbers);

      expect(response.data).toEqual(numbers);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data?.length).toBe(5);
    });
  });
}); 