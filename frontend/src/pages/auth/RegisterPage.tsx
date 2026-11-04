import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import authApi from '@/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { BoltIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setErrorMessage(null);
      const res = await authApi.register({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
      });

      login(res.tokens, res.user);
      toast.success('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Registration failed. Please check your information.';
      setErrorMessage(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <BoltIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Start organizing your sprints and teams in minutes.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Jane"
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>

          <Input
            label="Work Email"
            type="email"
            autoComplete="email"
            placeholder="jane@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              size="md"
              isLoading={isSubmitting}
            >
              Get Started Free
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
