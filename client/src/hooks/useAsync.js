import { useCallback, useState } from 'react';

export function useAsync(initialLoading = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res?.data?.data ?? res?.data);
      return res?.data?.data ?? res?.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, run, setData };
}
