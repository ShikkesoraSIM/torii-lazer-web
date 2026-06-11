import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#030014] flex justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-0 lg:items-center">
      <LoginForm />
    </div>
  );
};

export default LoginPage;
