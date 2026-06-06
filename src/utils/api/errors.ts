import toast from 'react-hot-toast';

type ApiIssue = { msg?: string };

type ApiErrorPayload = {
  // The server's primary shape is {"error": "..."}, occasionally nested as a
  // verification payload {"error": {"error": "...", "method": "..."}}.
  error?: unknown;
  error_description?: string;
  message?: string;
  // FastAPI validation/detail: string | [{ msg }] | { error }.
  detail?: unknown;
};

const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

const fromObj = (v: unknown): string | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as { error?: unknown; msg?: string; message?: string };
  return asStr(o.error) ?? asStr(o.msg) ?? asStr(o.message);
};

/**
 * Normalize any error our API can throw into a single human-readable string.
 *
 * Priority matters: the server returns real messages as {"error": "..."} (and a
 * nested {"error": {"error": ...}} for verification), FastAPI uses
 * {"detail": ...}, and axios only sets `message` ("Network Error" / "Request
 * failed with status code N") when there is no response body. Reading `error`
 * first means actual server messages win instead of falling through to the
 * generic axios string.
 */
export const getApiErrorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: ApiErrorPayload }; message?: string };
  const data = err.response?.data;

  if (data) {
    const fromError = asStr(data.error) ?? fromObj(data.error);
    if (fromError) return fromError;

    if (asStr(data.detail)) return asStr(data.detail)!;
    if (Array.isArray(data.detail) && data.detail.length) {
      const m = fromObj(data.detail[0] as ApiIssue);
      if (m) return m;
    }
    const fromDetail = fromObj(data.detail);
    if (fromDetail) return fromDetail;

    if (asStr(data.error_description)) return asStr(data.error_description)!;
    if (asStr(data.message)) return asStr(data.message)!;
  }

  return err.message?.trim() || 'An unexpected error occurred';
};

/** Show a toast with the best available message for any API error. */
export const handleApiError = (error: unknown): void => {
  toast.error(getApiErrorMessage(error));
};
