import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';
import type { LoginForm as LoginFormType } from '../../types';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Test key by default

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<LoginFormType>({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileTimedOut, setTurnstileTimedOut] = useState(false);
  const turnstileRef = useRef<any>(null);

  useEffect(() => {
    if (turnstileToken) {
      setTurnstileTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setTurnstileTimedOut(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [turnstileToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    const success = await login(formData.username, formData.password, turnstileToken);
    if (success) {
      // Volver a donde querias ir. Si llegaste al login porque intentaste abrir
      // algo que pide sesion (el panel, por ejemplo), mandarte a tu perfil te
      // obliga a buscar de nuevo a mano lo que ya habias pedido.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/profile', { replace: true });
    } else {
      // Refresh turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    }
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

  return (
    <div className="max-w-md w-full space-y-3">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto flex items-center justify-center mb-2">
          <img
            src="/image/logos/logo.png"
            srcSet="/image/logos/logo.png 1x, /image/logos/logo@2x.png 2x"
            alt={t('common.brandAlt')}
            className="w-12 h-12 object-contain"
          />
        </div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">{t('auth.login.title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('auth.login.subtitle')}</p>
      </div>

      <div className="glass rounded-2xl py-6 px-6 shadow-elev-2">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1.5">
              {t('auth.login.usernameOrEmail')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-text-muted" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full px-3 py-2.5 pl-10 border border-white/10 rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all"
                placeholder={t('auth.login.usernameOrEmailPlaceholder')}
                value={formData.username}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                {t('auth.login.password')}
              </label>
              <Link
                to="/password-reset"
                className="text-xs font-medium text-osu-pink hover:text-osu-pink/80 transition-colors"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-text-muted" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 pl-10 pr-10 border border-white/10 rounded-xl bg-[#0d122c]/80 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-torii/60 focus:border-torii/50 transition-all"
                placeholder={t('auth.login.passwordPlaceholder')}
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
          </div>

          <div className="flex flex-col items-center gap-2 pt-1">
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
            {turnstileTimedOut && !turnstileToken && (
              <div className="text-center text-xs text-amber-300 space-y-1">
                <p>Security check is taking unusually long to load.</p>
                <button
                  type="button"
                  onClick={handleRetryTurnstile}
                  className="text-osu-pink hover:underline font-medium"
                >
                  Retry verification
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !formData.username || !formData.password || !turnstileToken}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-elev-1 text-sm font-semibold text-white bg-[var(--torii-blue)] hover:bg-[var(--torii-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-torii disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : t('auth.login.submit')}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="font-medium text-osu-pink hover:text-osu-pink/80 transition-colors">
                {t('auth.login.registerNow')}
              </Link>
            </p>
          </div>
        </form>
      </div>

      <div className="text-center">
        <p className="text-xs text-text-muted">
          {t('common.authAgreement')}
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
