'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LockSimple,
  EnvelopeSimple,
  User,
  ArrowRight,
  Sparkle,
  CheckCircle,
  ShieldCheck,
  House,
  Key,
  Eye,
  EyeSlash,
  Crown
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { ResearchieLogo } from '@/components/ResearchieLogo';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.64 1.35-.56.65-1.06 1.72-.93 2.73 1.01.08 2.03-.48 2.64-1.23z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'signin';

  const {
    user,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
    signInWithEmail,
    signInAsDemo,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'register'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<'free' | 'pro' | 'team'>('pro');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // If already logged in, show status with continue button
  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook' | 'github') => {
    setIsLoading(true);
    setMessage(null);
    const res = await signInWithOAuth(provider);
    setIsLoading(false);
    if (res.success) {
      router.push('/');
    } else {
      setMessage({ text: res.message || 'OAuth sign in failed', type: 'error' });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);
    const res = await signInWithPassword(email, password);
    setIsLoading(false);
    if (res.success) {
      router.push('/');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);
    const res = await signUpWithPassword(name, email, password, tier);
    setIsLoading(false);
    if (res.success) {
      router.push('/');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleDemoAccess = (demoTier: 'free' | 'pro' | 'team') => {
    signInAsDemo(demoTier);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#EAEEF4] dark:bg-[#09090B] flex flex-col justify-center items-center p-4 font-sans text-slate-800 dark:text-zinc-200">
      
      {/* Return to App Bar */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors"
        >
          <House size={14} />
          <span>Back to Workspace</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-400">PRD Phase 4 Auth</span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden animate-popIn">
        
        {/* Brand Header */}
        <div className="p-6 pb-4 border-b border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#325FEC] flex items-center justify-center p-2 text-white shadow-xs mx-auto mb-2.5">
            <ResearchieLogo className="w-full h-full text-white" />
          </div>
          <h1 className="font-display font-bold text-xl text-[#0F172A] dark:text-white">
            researchie
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            In-situ capture, spatial timeline & AI synthesis workbench.
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#151518] p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-white dark:bg-[#202024] text-[#325FEC] dark:text-[#518FFF] shadow-xs border border-[#D2DCEA] dark:border-[#2E2E33]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-white dark:bg-[#202024] text-[#325FEC] dark:text-[#518FFF] shadow-xs border border-[#D2DCEA] dark:border-[#2E2E33]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Social OAuth Providers Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#1C1C20] hover:bg-slate-50 dark:hover:bg-[#25252A] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-[#24292E] text-white hover:bg-[#1B1F23] rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-black text-white hover:bg-zinc-800 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <AppleIcon />
              <span>Apple</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#1C1C20] hover:bg-slate-50 dark:hover:bg-[#25252A] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <FacebookIcon />
              <span>Meta</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#D2DCEA] dark:border-[#27272A]" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-slate-400 dark:text-zinc-500">
              Or with credentials
            </span>
            <div className="flex-grow border-t border-[#D2DCEA] dark:border-[#27272A]" />
          </div>

          {/* Form */}
          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <EnvelopeSimple size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Password
                  </label>
                </div>
                <div className="relative flex items-center">
                  <LockSimple size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Full Name / Title
                </label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Dr. Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Work / Institution Email
                </label>
                <div className="relative flex items-center">
                  <EnvelopeSimple size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="alex.rivera@stanford.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Choose Password
                </label>
                <div className="relative flex items-center">
                  <LockSimple size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Initial Plan Tier Choice */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Initial Plan Tier
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['free', 'pro', 'team'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`py-1.5 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                        tier === t
                          ? 'bg-[#325FEC] text-white border-[#325FEC] shadow-xs'
                          : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border-[#D2DCEA] dark:border-[#27272A]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </form>
          )}

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={15} weight="bold" /> : <LockSimple size={15} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Fast Track Instant Demo Evaluation */}
          <div className="pt-3 border-t border-[#D2DCEA] dark:border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Quick Test Bypass:</span>
              <button
                type="button"
                onClick={() => handleDemoAccess('pro')}
                className="font-semibold text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer flex items-center gap-1 text-xs"
              >
                <Sparkle size={13} weight="fill" />
                <span>Launch Instant Pro Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3 bg-[#F4F6F9] dark:bg-[#151518] border-t border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Encrypted Token Sessions</span>
          </div>
          <span>v2.4.0 Live</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#EAEEF4] dark:bg-[#09090B]" />}>
      <LoginContent />
    </Suspense>
  );
}
