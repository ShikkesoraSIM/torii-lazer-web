import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from ?? '/profile', { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  return (
    <div className="min-h-screen torii-page-stage flex justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-8 lg:items-center">
      <LoginForm />
    </div>
  );
};

export default LoginPage;
