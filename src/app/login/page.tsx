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
  Eye,
  EyeSlash,
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'signin';

  const {
    user,
    authRequired,
    inviteRequired,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
    signInAsDemo,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'register'>(initialTab);
  const [name, setName] = useState('');
  // "Switch account" opens this page as /login?email=... so the address is already filled in.
  const [email, setEmail] = useState(() => {
    const given = searchParams.get('email') || '';
    return given.length <= 254 && /^[^s@]+@[^s@]+.[^s@]+$/.test(given) ? given : '';
  });
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(() => {
    const problem = searchParams.get('error');
    if (problem === 'invite') return { text: 'That Google account is new, and creating an account needs the invite code. Enter the code on the Create account tab, then choose Google again.', type: 'error' };
    if (problem === 'google') return { text: 'Google sign-in did not finish. Try again, or use your email and password.', type: 'error' };
    return null;
  });

  // If already logged in, show status with continue button
  // "Switch account" and share links open this page with where to go next. Only a share link address is accepted.
  const goNext = () => {
    const next = searchParams.get('next') || '';
    router.push(/^\/share\/shr_[A-Za-z0-9_-]{10,100}$/.test(next) ? next : '/');
  };

  // Google sign-in starts on the server (S-45). The invite code typed on this page goes along, so a brand-new account
  // can pass it. It is switched on with NEXT_PUBLIC_GOOGLE_SIGNIN=true once Google is set up in Supabase.
  const googleOn = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === 'true';
  const startGoogle = () => {
    const next = searchParams.get('next') || '/';
    const invite = inviteCode.trim();
    window.location.assign(`/api/auth/google?next=${encodeURIComponent(next)}${invite ? `&invite=${encodeURIComponent(invite)}` : ''}`);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);
    const res = await signInWithPassword(email, password);
    setIsLoading(false);
    if (res.success) {
      goNext();
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);
    const res = await signUpWithPassword(name, email, password, inviteCode);
    setIsLoading(false);
    if (res.success && res.needsConfirmation) {
      setMessage({ text: res.message, type: 'success' });
    } else if (res.success) {
      goNext();
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
        <span className="text-[11px] font-mono text-slate-400">{authRequired ? 'Tester access' : 'Local mode'}</span>
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
          
          {/* Google sign-in: live once NEXT_PUBLIC_GOOGLE_SIGNIN=true (see docs/GOOGLE_SIGNIN_SETUP.md); until then a disabled placeholder. */}
          {googleOn && authRequired ? (
            <button
              type="button"
              onClick={startGoogle}
              data-testid="google-signin"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#1C1C20] hover:bg-[#F4F6F9] dark:hover:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs font-medium shadow-xs cursor-pointer"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          ) : (
          <button
            type="button"
            disabled
            title="Google sign-in is coming soon"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#1C1C20] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs font-medium shadow-xs opacity-60 cursor-not-allowed"
          >
            <GoogleIcon />
            <span>Continue with Google (coming soon)</span>
          </button>
          )}

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
                    placeholder="At least 8 characters"
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

              {inviteRequired && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Invite code
                  </label>
                  <div className="relative flex items-center">
                    <LockSimple size={15} className="absolute left-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      placeholder="From the person who invited you"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                    />
                  </div>
                </div>
              )}

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

          {/* Local development only: the tester deployment has no demo user. */}
          {!authRequired && (
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
          )}
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3 bg-[#F4F6F9] dark:bg-[#151518] border-t border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Secure cookie session</span>
          </div>
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
