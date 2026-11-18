import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import authApi from '@/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  UsersIcon,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setErrorMessage(null);
      const res = await authApi.login(data);
      login(res.tokens, res.user);
      toast.success(`Welcome back, ${res.user.first_name || 'User'}!`);

      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid email or password. Please try again.';
      setErrorMessage(message);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel: Brand and highlights */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg">
              <BoltIcon className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">KabanFlow SaaS</span>
          </div>

          <div className="mt-16 space-y-6 max-w-lg">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Manage your engineering sprints and tasks with total clarity.
            </h1>
            <p className="text-base text-indigo-200 leading-relaxed">
              The multi-tenant Jira alternative built for high-velocity software teams. Real-time
              drag-and-drop boards, sprint velocity tracking, audit logs, and webhooks.
            </p>

            <div className="pt-6 space-y-4">
              <div className="flex items-center space-x-3 text-sm text-indigo-100">
                <CheckCircleIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                <span>Drag-and-drop Kanban & Scrum boards with WIP limits</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-indigo-100">
                <ShieldCheckIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                <span>Multi-tenant workspace isolation with role-based access</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-indigo-100">
                <UsersIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                <span>Deep sprint planning, audit logs, and webhook integrations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 rounded-2xl bg-white/10 backdrop-blur-md p-6 border border-white/10">
          <p className="text-sm italic text-indigo-100">
            "KabanFlow gave our engineering department full visibility across 14 teams in minutes.
            The Kanban board is blazing fast."
          </p>
          <div className="mt-3 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-indigo-400 font-bold flex items-center justify-center text-xs text-indigo-950">
              ES
            </div>
            <div>
              <p className="text-xs font-semibold">Elena Rostova</p>
              <p className="text-[11px] text-indigo-300">VP of Engineering at CloudScale</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center space-x-2 lg:hidden mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BoltIcon className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-gray-900">KabanFlow SaaS</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-1 text-xs text-gray-500">
              Enter your credentials to access your workspaces.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-gray-600">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="ml-2">Remember me</span>
              </label>

              <Link
                to="/login"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Password reset email feature is in development.');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="md"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
