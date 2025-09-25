"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuth';
import { useEffect } from 'react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // ensure csrf cookie is present
    fetch('/api/auth/csrf', { credentials: 'include' }).catch(() => {});
  }, []);

  const onSubmit = async (data: LoginForm) => {
    await login(data.email, data.password);
    router.push('/dashboard');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-96 rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-xl font-bold">Login</h2>
        <input
          {...register('email')}
          placeholder="Email"
          className="mb-2 w-full rounded border p-2"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        
        <input
          {...register('password')}
          type="password"
          placeholder="Password"
          className="mb-2 w-full rounded border p-2"
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        
        <button
          type="submit"
          className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
