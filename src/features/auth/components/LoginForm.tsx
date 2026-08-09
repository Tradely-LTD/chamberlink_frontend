import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@shared/hooks/useAppDispatch';
import { setCredentials, setPendingMfa } from '../authSlice';
import { useLoginMutation } from '../authApi';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { fetchUserWithToken } from '@shared/utils/fetchUserWithToken';
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

export function LoginForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
  });

  const [login, { isLoading, error: loginError }] = useLoginMutation();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = searchParams.get('redirectTo');
      navigate(redirectTo ? decodeURIComponent(redirectTo) : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await login(values).unwrap();
      if (result.requiresMfa) {
        dispatch(setPendingMfa({ userId: result.userId }));
        navigate('/auth/mfa-verify');
      } else {
        tokenStorage.set(result.refreshToken);
        const user = await fetchUserWithToken(result.accessToken);
        dispatch(setCredentials({ accessToken: result.accessToken, user }));
        const redirectTo = searchParams.get('redirectTo');
        navigate(redirectTo ? decodeURIComponent(redirectTo) : '/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        'Invalid credentials';
      setError('password', { message: msg });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      {searchParams.get('reason') === 'session_expired' && (
        <ErrorBanner message="Your session has expired. Please log in again." />
      )}
      {loginError && !errors.password && (
        <ErrorBanner message="An error occurred. Please try again." />
      )}
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex justify-end">
        <Link
          to="/auth/forgot-password"
          className="text-sm text-[#023293] hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={isLoading} className="w-full">
        Sign In
      </Button>
      <p className="text-center text-sm text-[#8A7E6E]">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-[#023293] font-medium hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
