import { UserRole } from '../guards/roles.guard';

// Simple test without complex mocking
describe('Roles Decorator', () => {
  // Test the enum values directly
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

  // Test that the decorator can be imported and used
  describe('Roles decorator import', () => {
    it('should be able to import the Roles decorator', async () => {
      const { Roles } = await import('./roles.decorator');
      expect(typeof Roles).toBe('function');
    });

    it('should be able to call the Roles decorator with roles', async () => {
      const { Roles } = await import('./roles.decorator');
      expect(() => Roles(UserRole.ADMIN)).not.toThrow();
      expect(() => Roles(UserRole.USER, UserRole.ADMIN)).not.toThrow();
      expect(() => Roles()).not.toThrow();
    });
  });
}); 