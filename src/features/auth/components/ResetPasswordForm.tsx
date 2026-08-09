import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link } from 'react-router-dom';
import { useResetPasswordMutation } from '../authApi';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../schemas/resetPasswordSchema';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

interface Props {
  userId: string;
  token: string;
}

export function ResetPasswordForm({ userId, token }: Props) {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
  });
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await resetPassword({
        userId,
        code: token,
        newPassword: values.newPassword,
      }).unwrap();
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        'Reset failed. The link may have expired.';
      setError('root', { message: msg });
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="font-medium text-[#023293]">
          Password reset successfully!
        </p>
        <Link to="/login" className="text-sm text-[#023293] hover:underline">
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      {errors.root && (
        <ErrorBanner message={errors.root.message ?? 'Error'} />
      )}
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" loading={isLoading} className="w-full">
        Reset Password
      </Button>
      <Link
        to="/auth/forgot-password"
        className="text-center text-sm text-[#023293] hover:underline"
      >
        Request a new reset link
      </Link>
    </form>
  );
}
