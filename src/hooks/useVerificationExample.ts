// Example showing how to manually trigger the verification flow
import { useVerification } from '../contexts/VerificationContext';

export const useVerificationExample = () => {
  const { showVerificationModal } = useVerification();

  const triggerVerification = async (method: 'totp' | 'mail') => {
    try {
      await showVerificationModal(method);
      // Handle the post-verification-success logic here
    } catch {
      // Handle the verification-failure logic here
    }
  };

  return { triggerVerification };
};

// Usage example:
// const { triggerVerification } = useVerificationExample();
//
// const handleSomeAction = async () => {
//   try {
//     // Run the operation that requires verification
//     await triggerVerification('totp');
//     // Verification succeeded, continue
//   } catch (error) {
//     // Verification failed, handle the error
//   }
// };





