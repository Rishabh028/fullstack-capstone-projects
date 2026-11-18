'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Users, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

const DEMO_PERSONAS = [
  {
    name: 'Alice Walker',
    role: 'Workspace Owner',
    email: 'alice@example.com',
    color: '#6366f1',
    description: 'Can manage workspace, members, and edit all docs',
  },
  {
    name: 'Bob Chen',
    role: 'Admin / Editor',
    email: 'bob@example.com',
    color: '#10b981',
    description: 'Can invite members, create and edit docs',
  },
  {
    name: 'Charlie Davis',
    role: 'Editor',
    email: 'charlie@example.com',
    color: '#f59e0b',
    description: 'Can edit docs and canvases in real-time',
  },
  {
    name: 'Diana Prince',
    role: 'Viewer',
    email: 'diana@example.com',
    color: '#ec4899',
    description: 'Read-only access: view documents and cursors',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    const targetEmail = customEmail || email;
    const targetPassword = customEmail ? 'password123' : password;

    try {
      setLoading(true);
      setErrorMsg('');

      const endpoint = isSignUp && !customEmail ? '/api/auth/signup' : '/api/auth/login';
      const body = isSignUp && !customEmail ? { name, email: targetEmail, password: targetPassword } : { email: targetEmail, password: targetPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
        return;
      }

      router.push(`/workspace/${data.workspaceSlug}`);
      router.refresh();
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Col: Demo Personas (1-click multi-user testing) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-sm font-bold text-indigo-600 tracking-wide uppercase">
              Real-Time CRDT Multi-User Testing
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Collaborative Workspace
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Open multiple browser tabs or windows side-by-side. Click any persona below to log in instantly and experience real-time cursor movement, text synchronization, and whiteboard editing!
          </p>

          <div className="grid gap-2.5 pt-2">
            {DEMO_PERSONAS.map((persona) => (
              <button
                key={persona.email}
                type="button"
                onClick={(e) => handleLogin(e, persona.email)}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-xs hover:shadow-md text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-2xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: persona.color }}
                  >
                    {persona.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {persona.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {persona.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{persona.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Custom Login / Signup Form */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isSignUp ? 'Create your account' : 'Sign in with credentials'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isSignUp ? 'Already registered? Sign in' : 'New user? Sign up'}
            </button>
          </div>

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="alice@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/40 p-2 rounded">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
            Powered by Yjs CRDTs • WebSockets • Redis • Prisma
          </div>
        </div>
      </div>
    </div>
  );
}
