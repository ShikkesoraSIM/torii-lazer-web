import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiKey } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Test key by default

type ResetStep = 'request' | 'reset';

interface FormData {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
}

const PasswordResetPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<ResetStep>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [resendCountdown, setResendCountdown] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<any>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return t('auth.passwordReset.errors.emailRequired');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return t('auth.passwordReset.errors.emailInvalid');
    }
    return null;
  };

  const validateResetCode = (code: string): string | null => {
    if (!code) {
      return t('auth.passwordReset.errors.codeRequired');
    }
    if (!/^\d{8}$/.test(code)) {
      return t('auth.passwordReset.errors.codeInvalid');
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return t('auth.passwordReset.errors.passwordRequired');
    }
    if (password.length < 8) {
      return t('auth.passwordReset.errors.passwordMin');
    }
    // Strength check (upper + lower + digit) intentionally dropped to
    // match the server's validate_password (8+ chars only). See the
    // matching comment in RegisterPage.tsx for the full rationale —
    // forcing users to change their password to a less memorable form
    // when going through a reset flow was the worst time to do it.
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.requestPasswordReset(formData.email, turnstileToken);
      toast.success(t('auth.passwordReset.codeSent'));
      setStep('reset');
      setResendCountdown(60); // 60 seconds countdown
      // Reset turnstile token for the next step
      setTurnstileToken('');
    } catch (error: any) {
      console.error('Failed to request password reset:', error);
      
      // Refresh turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      const errorMessage = String(error?.response?.data?.error || '').toLowerCase();
      const isRateLimited = error?.response?.status === 429 || errorMessage.includes('too many requests');

      if (isRateLimited) {
        toast.error(t('auth.passwordReset.errors.rateLimited', {
          defaultValue: 'Too many requests. Wait a minute before trying again.',
        }));
        setResendCountdown(60);
        setTurnstileToken('');
      } else {
        toast.error(t('auth.passwordReset.errors.sendFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    try {
      await authAPI.requestPasswordReset(formData.email, turnstileToken);
      toast.success(t('auth.passwordReset.codeSent'));
      setResendCountdown(60);
    } catch (error) {
      console.error('Failed to resend code:', error);
      toast.error(t('auth.passwordReset.errors.sendFailed'));
      // Refresh turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<FormData> = {};
    
    const codeError = validateResetCode(formData.resetCode);
    if (codeError) newErrors.resetCode = codeError;

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) newErrors.newPassword = passwordError;

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordReset.errors.confirmPasswordRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordReset.errors.confirmPasswordMatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(formData.email, formData.resetCode, formData.newPassword, turnstileToken);
      toast.success(t('auth.passwordReset.success'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      // Refresh turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      if (error.response?.status === 400 || error.response?.status === 404) {
        toast.error(t('auth.passwordReset.errors.invalidCode'));
      } else {
        toast.error(t('auth.passwordReset.errors.resetFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('');
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, []);

  return (
    <div className="min-h-[100dvh] torii-page-stage flex justify-center px-4 sm:px-6 lg:px-8 overflow-auto pt-12 sm:pt-16 lg:pt-8 lg:items-center">
      <div className="max-w-md w-full space-y-4 pb-8 lg:pb-0">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center mb-2">
            <img
              src="/image/logos/logo.png"
              srcSet="/image/logos/logo.png 1x, /image/logos/logo@2x.png 2x"
              alt={t('common.brandAlt')}
              className="w-12 h-12 object-contain"
            />
          </div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            {t('auth.passwordReset.title')}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {step === 'request' 
              ? t('auth.passwordReset.subtitle')
              : t('auth.passwordReset.codeExpiry')}
          </p>
        </div>

        <div className="glass rounded-2xl py-6 px-6 shadow-elev-2">
          {step === 'request' ? (
            <form className="space-y-4" onSubmit={handleRequestCode}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('auth.passwordReset.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={`w-full px-3 py-2.5 pl-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                      errors.email ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder={t('auth.passwordReset.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={handleTurnstileSuccess}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileError}
                  options={{
                    theme: 'dark',
                    size: 'normal',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !turnstileToken}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-elev-1 text-sm font-semibold text-white bg-[var(--torii-blue)] hover:bg-[var(--torii-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-torii disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : t('auth.passwordReset.sendCode')}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-osu-pink hover:text-osu-pink/80 transition-colors flex items-center justify-center gap-1"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  {t('auth.passwordReset.backToLogin')}
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="resetCode" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('auth.passwordReset.resetCode')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiKey className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    id="resetCode"
                    name="resetCode"
                    type="text"
                    required
                    maxLength={8}
                    className={`w-full px-3 py-2.5 pl-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                      errors.resetCode ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder={t('auth.passwordReset.resetCodePlaceholder')}
                    value={formData.resetCode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                {errors.resetCode && (
                  <p className="mt-1 text-sm text-red-400">{errors.resetCode}</p>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    {formData.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCountdown > 0 || isLoading}
                    className="text-xs text-osu-pink hover:text-osu-pink/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCountdown > 0 
                      ? t('auth.passwordReset.resendAvailableIn', { seconds: resendCountdown })
                      : t('auth.passwordReset.resendCode')}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('auth.passwordReset.newPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={`w-full px-3 py-2.5 pl-10 pr-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                      errors.newPassword ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('auth.passwordReset.confirmPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`w-full px-3 py-2.5 pl-10 pr-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                      errors.confirmPassword ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder={t('auth.passwordReset.confirmPasswordPlaceholder')}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={handleTurnstileSuccess}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileError}
                  options={{
                    theme: 'dark',
                    size: 'normal',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !formData.resetCode || !formData.newPassword || !formData.confirmPassword || !turnstileToken}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-elev-1 text-sm font-semibold text-white bg-[var(--torii-blue)] hover:bg-[var(--torii-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-torii disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : t('auth.passwordReset.resetPassword')}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-sm font-medium text-osu-pink hover:text-osu-pink/80 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  {t('auth.passwordReset.backToLogin')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-text-muted">
            {t('common.authAgreement')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;

