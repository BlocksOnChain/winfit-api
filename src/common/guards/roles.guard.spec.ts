import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, UserRole, ROLES_KEY } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockRequest: any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);

    mockRequest = {};
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler!(),
        mockExecutionContext.getClass!(),
      ]);
    });

    it('should return true when no roles are required (empty array)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = undefined;

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user is null', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = null;

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('User not authenticated');
    });

    it('should return true when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: UserRole.ADMIN };

      const result = guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.USER]);
      mockRequest.user = { role: UserRole.USER };

      const result = guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: UserRole.USER };

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('Insufficient permissions');
    });

    it('should throw ForbiddenException when user does not have any of multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: UserRole.USER };

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('Insufficient permissions');
    });

    it('should handle user with undefined role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: undefined };

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('Insufficient permissions');
    });

    it('should handle user with null role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: null };

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('Insufficient permissions');
    });

    it('should handle user with invalid role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = { role: 'invalid-role' };

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow(ForbiddenException);

      expect(() => {
        guard.canActivate(mockExecutionContext as ExecutionContext);
      }).toThrow('Insufficient permissions');
    });

    it('should work with user object containing additional properties', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.USER]);
      mockRequest.user = {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
        name: 'Test User'
      };

      const result = guard.canActivate(mockExecutionContext as ExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('UserRole enum', () => {
    it('should have correct role values', () => {
      expect(UserRole.USER).toBe('user');
      expect(UserRole.ADMIN).toBe('admin');
    });

    it('should have exactly two roles', () => {
      const roleValues = Object.values(UserRole);
      expect(roleValues).toHaveLength(2);
      expect(roleValues).toContain('user');
      expect(roleValues).toContain('admin');
    });
  });

  describe('ROLES_KEY constant', () => {
    it('should have correct value', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });
}); 