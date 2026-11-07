import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { EnvelopeSimple, CircleNotch, ArrowRight, ArrowLeft, CheckCircle } from '../icons';
import Logo from '../Logo';

export const ForgotPasswordView = ({ onNavigateToLogin, onExploreDemo }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to send password reset link. Please try again.');
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

        {/* Neumorphic Main Card */}
        <div className="bg-[#e6ebf2] border border-slate-300/40 rounded-[2rem] p-7 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          <div className="pb-4 mb-5 border-b border-zinc-300/60 text-center">
            <h2 className="text-lg font-bold text-zinc-900">Reset Password</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter your email and we&apos;ll send you instructions to reset your password
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#d9b8b8,inset_-3px_-3px_6px_#ffffff] border border-rose-300/60 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success State */}
          {isSubmitted ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#bdddc9,inset_-3px_-3px_6px_#ffffff] border border-emerald-300/60 text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-900">Reset Link Sent</div>
                  <div className="leading-relaxed text-zinc-600">
                    If an account exists for <strong className="text-zinc-900 font-semibold">{email}</strong>, you will receive password reset instructions shortly.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] cursor-pointer border border-zinc-800/80"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Address Field */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2 ml-1">
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
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <div className="w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                        <ArrowRight size={18} weight="bold" />
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Switch to Sign In */}
              {onNavigateToLogin && (
                <div className="pt-2 text-center text-xs text-zinc-500">
                  <span>Remember your password? </span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
