import { useToast } from '../context/ToastContext';

export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useApiError() {
  const toast = useToast();
  return (err, fallback) => toast.error(errorMessage(err, fallback));
}
