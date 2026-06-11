import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { VerificationModal } from '../components/VerificationModal/VerificationModal';
import { verificationAPI, isVerificationError, getVerificationMethod } from '../utils/api/verification';
import { setGlobalVerificationHandler } from '../utils/api/client';

interface VerificationContextType {
  showVerificationModal: (method: 'totp' | 'mail') => Promise<void>;
  handleVerificationError: (error: any) => boolean;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

interface VerificationProviderProps {
  children: ReactNode;
}

export const VerificationProvider: React.FC<VerificationProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<'totp' | 'mail'>('totp');
  const [resolveVerification, setResolveVerification] = useState<(() => void) | null>(null);
  const [, setRejectVerification] = useState<((error: Error) => void) | null>(null);

  const showVerificationModal = (method: 'totp' | 'mail'): Promise<void> => {
    return new Promise((resolve, reject) => {
      setCurrentMethod(method);
      setIsModalOpen(true);
      setResolveVerification(() => resolve);
      setRejectVerification(() => reject);
    });
  };

  const handleVerify = async (code: string): Promise<void> => {
    try {
      await verificationAPI.verify(code);
      setIsModalOpen(false);
      if (resolveVerification) {
        resolveVerification();
        setResolveVerification(null);
        setRejectVerification(null);
      }
      // Reload the page after success so API requests are re-issued
      window.location.reload();
    } catch (error) {
      // On failure, rethrow so the modal can display the error message
      throw error;
    }
  };

  const handleSwitchMethod = async (): Promise<void> => {
    try {
      if (currentMethod === 'totp') {
        // Switch from TOTP to email verification
        await verificationAPI.switchToMailFallback();
        setCurrentMethod('mail');
      } else {
        // Switch from email back to TOTP (may need adjusting depending on the API design)
        setCurrentMethod('totp');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleResendCode = async (): Promise<void> => {
    if (currentMethod === 'mail') {
      await verificationAPI.reissueCode();
    }
  };

  const handleVerificationError = (error: any): boolean => {
    if (isVerificationError(error)) {
      const method = getVerificationMethod(error);
      if (method) {
        showVerificationModal(method).catch(() => {
          // Handle the case where the user cancels verification
        });
        return true;
      }
    }
    return false;
  };

  // Register the global verification handler on mount
  useEffect(() => {
    setGlobalVerificationHandler(handleVerificationError);

    // Cleanup
    return () => {
      setGlobalVerificationHandler(() => false);
    };
  }, []);

  const contextValue: VerificationContextType = {
    showVerificationModal,
    handleVerificationError,
  };

  return (
    <VerificationContext.Provider value={contextValue}>
      {children}
      <VerificationModal
        isOpen={isModalOpen}
        method={currentMethod}
        onVerify={handleVerify}
        onSwitchMethod={handleSwitchMethod}
        onResendCode={currentMethod === 'mail' ? handleResendCode : undefined}
      />
    </VerificationContext.Provider>
  );
};

export const useVerification = (): VerificationContextType => {
  const context = useContext(VerificationContext);
  if (context === undefined) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
};
