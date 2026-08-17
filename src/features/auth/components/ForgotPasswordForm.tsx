import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForgotPasswordMutation } from '../authApi';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '../schemas/forgotPasswordSchema';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
  });
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await forgotPassword(values).unwrap();
    } catch {
      // Always show success to prevent email enumeration
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="text-sm text-ink-subtle text-center">
        If an account exists for that email, a reset link has been sent.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" loading={isLoading} className="w-full">
        Send Reset Code
      </Button>
    </form>
  );
}
