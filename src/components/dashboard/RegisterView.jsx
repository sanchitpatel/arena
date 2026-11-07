import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Lock, EnvelopeSimple, User, Eye, EyeSlash, CircleNotch, ArrowRight, CheckCircle } from '../icons';
import Logo from '../Logo';

export const RegisterView = ({ onNavigateToLogin, onExploreDemo }) => {
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-up error:', err);
      setErrorMessage(err.message || 'Failed to sign up with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const data = await signUp(email, password, fullName);

      // If Supabase has email confirmation enabled
      if (data?.user && !data?.session) {
        setSuccessMessage('Registration successful! Please check your email inbox to verify your account.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting...');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        setErrorMessage('This email is already registered. Please sign in instead.');
      } else {
        setErrorMessage(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] text-zinc-800 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      <div className="w-full max-w-[430px] relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* Neumorphic Brand Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6ebf2] shadow-[6px_6px_14px_#c2c9d4,-6px_-6px_14px_#ffffff] mb-2">
            <Logo dark className="w-14 h-14 !rounded-full shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl font-sans">
            AI Tutor
          </h1>
        </div>

        {/* Neumorphic Main Card (Inward Shadow: White on top, dark at bottom) */}
        <div className="bg-[#e6ebf2] border border-slate-300/40 rounded-[2rem] p-7 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          <div className="pb-4 mb-5 border-b border-zinc-300/60 text-center">
            <h2 className="text-lg font-bold text-zinc-900">Create Account</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Start your personalized intelligent learning journey</p>
          </div>

          {/* Google Sign Up Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className="w-full py-3 px-5 bg-[#e6ebf2] text-zinc-800 font-semibold text-sm rounded-full transition-all duration-200 flex items-center justify-center gap-3 shadow-[3px_3px_6px_#c6ced9,-3px_-3px_6px_#ffffff] hover:shadow-[2px_2px_4px_#c6ced9,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#c6ced9,inset_-2px_-2px_4px_#ffffff] active:scale-[0.98] cursor-pointer border border-white/80 group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>
          </div>

          {/* Neumorphic OR Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-zinc-300/80 shadow-[0_1px_0_#ffffff]" />
            <span className="absolute bg-[#e6ebf2] px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest shadow-[inset_1px_1px_2px_#c2c9d4,inset_-1px_-1px_2px_#ffffff] rounded-full py-0.5 border border-white/50">
              OR
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#d9b8b8,inset_-3px_-3px_6px_#ffffff] border border-rose-300/60 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#bdddc9,inset_-3px_-3px_6px_#ffffff] border border-emerald-300/60 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                  <User size={19} weight="bold" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  disabled={isLoading}
                  style={{ outline: 'none' }}
                  className="w-full pl-11 pr-4 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-medium"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                  <EnvelopeSimple size={19} weight="bold" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  style={{ outline: 'none' }}
                  className="w-full pl-11 pr-4 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                  <Lock size={19} weight="bold" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  style={{ outline: 'none' }}
                  className="w-full pl-11 pr-12 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-700 active:scale-95 transition-transform cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={19} weight="bold" /> : <Eye size={19} weight="bold" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                  <Lock size={19} weight="bold" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  style={{ outline: 'none' }}
                  className="w-full pl-11 pr-12 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-700 active:scale-95 transition-transform cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeSlash size={19} weight="bold" /> : <Eye size={19} weight="bold" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] cursor-pointer border border-zinc-800/80 group"
              >
                {isLoading ? (
                  <>
                    <CircleNotch size={18} className="animate-spin text-zinc-300" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <div className="w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                      <ArrowRight size={18} weight="bold" />
                    </div>
                  </>
                )}
              </button>
            </div>

            {/* Switch to Sign In */}
            {onNavigateToLogin && (
              <div className="text-center text-xs text-zinc-500">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-bold text-zinc-800 hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Explore Demo Preview */}
            {onExploreDemo && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="font-sans text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer py-1"
                >
                  Explore Learning Console Demo →
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
