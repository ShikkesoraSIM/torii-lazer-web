import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import type { RegisterForm } from '../types';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Test key by default

const RegisterPage: React.FC = () => {
  const { register, isLoading, isAuthenticated } = useAuth();
  const { isAero } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileTimedOut, setTurnstileTimedOut] = useState(false);
  const turnstileRef = useRef<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiAcknowledged, setAiAcknowledged] = useState(false);

  useEffect(() => {
    if (turnstileToken) {
      setTurnstileTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTurnstileTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, [turnstileToken]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterForm> = {};

    if (!formData.username) {
      newErrors.username = t('auth.register.errors.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('auth.register.errors.usernameMin');
    } else if (formData.username.length > 15) {
      newErrors.username = t('auth.register.errors.usernameMax');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = t('auth.register.errors.usernamePattern');
    } else if (/^\d/.test(formData.username)) {
      newErrors.username = t('auth.register.errors.usernameStart');
    }

    if (!formData.email) {
      newErrors.email = t('auth.register.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.register.errors.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.register.errors.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.register.errors.passwordMin');
    }
    // Note: the "must include upper + lower + digit" strength check was
    // dropped here to match the server's own validation (app/auth.py
    // validate_password — only enforces length >= 8). Forcing case +
    // digit on registration was bouncing users who'd genuinely picked a
    // memorable lowercase passphrase, and the friction was making people
    // change to something unmemorable just to clear the form — exactly
    // the bad-UX outcome strong-password rules are supposed to prevent.
    // The passwordStrength i18n key is kept in the locale files in case
    // we want to bring this back as a "suggestion" hint later, but it
    // is no longer wired as a hard error.

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.register.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.register.errors.confirmPasswordMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const doRegister = async () => {
    const success = await register(
      formData.username,
      formData.email,
      formData.password,
      turnstileToken
    );

    if (success) {
      navigate('/profile');
    } else {
      // Refresh turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Show the AI disclosure once, right before the account is actually created.
    if (!aiAcknowledged) {
      setShowAiModal(true);
      return;
    }

    await doRegister();
  };

  const handleAiAcknowledge = async () => {
    setAiAcknowledged(true);
    setShowAiModal(false);
    await doRegister();
  };

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileTimedOut(false);
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('');
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, []);

  const handleRetryTurnstile = () => {
    setTurnstileTimedOut(false);
    setTurnstileToken('');
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof RegisterForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="min-h-screen torii-page-stage flex justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-8 lg:items-center">
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="max-w-md w-full rounded-2xl glass-thick p-6 shadow-elev-4">
            <h3 className="font-heading text-lg font-bold text-text-primary mb-2">Before you sign up</h3>
            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              Torii and some of its assets (a bit of the art, and parts of the server, client and website)
              are built with the help of AI. We are telling you upfront instead of hiding it. You can read
              the full statement{' '}
              <a href="/about" target="_blank" rel="noopener noreferrer" className="text-torii hover:text-torii-hover hover:underline font-medium">here</a>.
            </p>
            <button
              type="button"
              onClick={handleAiAcknowledge}
              className="torii-btn-primary w-full inline-flex items-center justify-center"
            >
              Got it
            </button>
          </div>
        </div>
      )}
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
            {t('auth.register.title')}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <div className="glass rounded-2xl py-6 px-6 shadow-elev-2">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.register.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className={`w-full px-3 py-2.5 pl-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                    errors.username ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder={t('auth.register.usernamePlaceholder')}
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.register.email')}
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
                  placeholder={t('auth.register.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.register.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`w-full px-3 py-2.5 pl-10 pr-10 border rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all ${
                    errors.password ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder={t('auth.register.passwordPlaceholder')}
                  value={formData.password}
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.register.confirmPassword')}
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
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
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

            <div className="flex flex-col items-center gap-2 pt-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={handleTurnstileSuccess}
                onError={handleTurnstileError}
                onExpire={handleTurnstileError}
                options={{
                  theme: isAero ? 'light' : 'dark',
                  size: 'normal',
                }}
              />
              {turnstileTimedOut && !turnstileToken && (
                <div className="text-center text-xs text-amber-300 space-y-1">
                  <p>Security check is taking unusually long to load.</p>
                  <button
                    type="button"
                    onClick={handleRetryTurnstile}
                    className="text-torii hover:text-torii-hover hover:underline font-medium"
                  >
                    Retry verification
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !turnstileToken}
                className="torii-btn-primary w-full flex justify-center items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  t('auth.register.submit')
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-text-secondary">
                {t('auth.register.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="font-medium text-torii hover:text-torii-hover transition-colors"
                >
                  {t('auth.register.loginNow')}
                </Link>
              </p>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-xs text-text-muted">
            {t('common.registerAgreement')}
          </p>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            A quick honest heads up: Torii is one person, me. I use AI to help build parts of it
            (the server, the client, the website, art like these default avatars), and there is
            still endless manual work on top of all of it. I would rather be upfront about that
            than hide it.{' '}
            <Link to="/about" className="text-torii hover:text-torii-hover hover:underline">More about Torii</Link>.
            You can switch your avatar to the plain Torii logo in settings, or upload your own.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
