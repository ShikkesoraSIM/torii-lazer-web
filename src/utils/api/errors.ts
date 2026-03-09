import toast from 'react-hot-toast';

type ApiIssue = {
  msg?: string;
};

type ApiErrorPayload = {
  error_description?: string;
  message?: string;
  detail?: unknown;
};

export const handleApiError = (error: unknown) => {
  const err = error as {
    response?: { data?: ApiErrorPayload };
    message?: string;
  };

  const data = err.response?.data;
  const detail = data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    toast.error(detail);
    return;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstIssue = detail[0] as ApiIssue;
    if (firstIssue?.msg) {
      toast.error(firstIssue.msg);
      return;
    }
  }

  if (data?.error_description) {
    toast.error(data.error_description);
    return;
  }

  if (data?.message) {
    toast.error(data.message);
    return;
  }

  if (err.message) {
    toast.error(err.message);
    return;
  }

  toast.error('An unexpected error occurred');
};
