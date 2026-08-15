import { loginSchema } from '../schemas/loginSchema';
import { registerSchema } from '../schemas/registerSchema';
import { forgotPasswordSchema } from '../schemas/forgotPasswordSchema';
import { resetPasswordSchema } from '../schemas/resetPasswordSchema';

describe('loginSchema', () => {
  it('passes with valid email and password', async () => {
    await expect(
      loginSchema.validate({ email: 'user@example.com', password: 'secret' })
    ).resolves.toBeTruthy();
  });

  it('fails with invalid email', async () => {
    await expect(
      loginSchema.validate({ email: 'not-an-email', password: 'secret' })
    ).rejects.toThrow('Enter a valid email address');
  });

  it('fails without password', async () => {
    await expect(
      loginSchema.validate({ email: 'user@example.com', password: '' })
    ).rejects.toThrow('Password is required');
  });
});

describe('registerSchema', () => {
  const valid = {
    firstName: 'Abubakar',
    lastName: 'Ringim',
    email: 'user@example.com',
    phone: '08012345678',
    password: 'Password1',
    confirmPassword: 'Password1',
  };

  it('passes with valid data', async () => {
    await expect(registerSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('rejects invalid Nigerian phone', async () => {
    await expect(
      registerSchema.validate({ ...valid, phone: '12345' })
    ).rejects.toThrow('Enter a valid Nigerian phone number');
  });

  it('rejects password without uppercase', async () => {
    await expect(
      registerSchema.validate({ ...valid, password: 'password1', confirmPassword: 'password1' })
    ).rejects.toThrow('Must contain at least one uppercase letter');
  });

  it('rejects mismatched confirm password', async () => {
    await expect(
      registerSchema.validate({ ...valid, confirmPassword: 'Different1' })
    ).rejects.toThrow('Passwords do not match');
  });

  it('rejects password shorter than 8 chars', async () => {
    await expect(
      registerSchema.validate({ ...valid, password: 'Pas1', confirmPassword: 'Pas1' })
    ).rejects.toThrow('at least 8 characters');
  });

  // Multi-chamber ChamberLink identity: self-registration creates a global,
  // chamber-independent identity — there must be no chamber/tenant picker.
  it('has no tenantId field — registration never offers a chamber choice', () => {
    expect(Object.prototype.hasOwnProperty.call(registerSchema.fields, 'tenantId')).toBe(false);
  });

  it('strips an unexpected tenantId from validated output', async () => {
    const result = await registerSchema.validate(
      { ...valid, tenantId: 'some-tenant-id' },
      { stripUnknown: true }
    );
    expect(result).not.toHaveProperty('tenantId');
  });
});

describe('forgotPasswordSchema', () => {
  it('passes with valid email', async () => {
    await expect(
      forgotPasswordSchema.validate({ email: 'user@example.com' })
    ).resolves.toBeTruthy();
  });

  it('fails with missing email', async () => {
    await expect(
      forgotPasswordSchema.validate({ email: '' })
    ).rejects.toThrow('Email is required');
  });
});

describe('resetPasswordSchema', () => {
  const valid = { newPassword: 'Password1', confirmPassword: 'Password1' };

  it('passes with matching passwords', async () => {
    await expect(resetPasswordSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('fails when passwords do not match', async () => {
    await expect(
      resetPasswordSchema.validate({ ...valid, confirmPassword: 'Other1234' })
    ).rejects.toThrow('Passwords do not match');
  });

  it('fails without digit in password', async () => {
    await expect(
      resetPasswordSchema.validate({
        newPassword: 'PasswordABC',
        confirmPassword: 'PasswordABC',
      })
    ).rejects.toThrow('Must contain at least one digit');
  });
});
