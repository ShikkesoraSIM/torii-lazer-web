import { api } from './client';
import { getDeviceUUID } from '../deviceUUID';

export interface VerificationError {
  error: {
    error: string;
    method: 'totp' | 'mail';
  };
}

export interface VerificationResponse {
  method: 'totp' | 'mail';
}

export interface ResendResponse {
  success: boolean;
  message: string;
}

export const verificationAPI = {
  // Verify the session
  verify: async (verificationKey: string): Promise<void> => {
    const formData = new URLSearchParams();
    formData.append('verification_key', verificationKey);

    // Get the device UUID (async)
    const deviceUUID = await getDeviceUUID();

    const response = await api.post('/api/v2/session/verify', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-UUID': deviceUUID,
      },
    });
    
    return response.data;
  },

  // Resend the verification code (email)
  reissueCode: async (): Promise<ResendResponse> => {
    const response = await api.post('/api/v2/session/verify/reissue');
    return response.data;
  },

  // Switch to email verification mode
  switchToMailFallback: async (): Promise<VerificationResponse> => {
    const response = await api.post('/api/v2/session/verify/mail-fallback');
    return response.data;
  },
};

// Check whether an error is a user-verification error
export const isVerificationError = (error: any): error is { response: { data: VerificationError } } => {
  return (
    error?.response?.data?.error?.error === 'User not verified' &&
    (error?.response?.data?.error?.method === 'totp' || error?.response?.data?.error?.method === 'mail')
  );
};

// Extract the verification method from an error
export const getVerificationMethod = (error: any): 'totp' | 'mail' | null => {
  if (isVerificationError(error)) {
    return error.response.data.error.method;
  }
  return null;
};





