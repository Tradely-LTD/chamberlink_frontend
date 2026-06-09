import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@shared/hooks/useAppDispatch';
import { setPendingVerify } from '../authSlice';
import { useRegisterMutation } from '../authApi';
import {
  registerSchema,
  type RegisterFormValues,
} from '../schemas/registerSchema';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

export function RegisterForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
  });
  const [registerUser, { isLoading }] = useRegisterMutation();

  const onSubmit = async (values: RegisterFormValues) => {
    const { confirmPassword: _confirmPassword, ...body } = values;
    try {
      const result = await registerUser(body).unwrap();
      dispatch(setPendingVerify({ userId: result.userId }));
      navigate('/auth/verify-email');
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { message?: string } };
      if (e.status === 409) {
        setError('email', {
          message: 'An account with this email already exists.',
        });
      } else {
        setError('root', {
          message:
            e.data?.message ?? 'Registration failed. Please try again.',
        });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {errors.root && (
        <ErrorBanner message={errors.root.message ?? 'Error'} />
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label="Last name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Phone number"
        type="tel"
        placeholder="08012345678"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" loading={isLoading} className="w-full mt-2">
        Create Account
      </Button>
      <p className="text-center text-sm text-[#8A7E6E]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-[#00502e] font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
