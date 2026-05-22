import { useState, useEffect } from 'react';
import {
  getDashboardMetrics,
  getDashboardErrors,
  type MetricsResponse,
  type ErrorsResponse,
} from '../api/dashboard';

export function useDashboard(range: '1h' | '6h' | '24h') {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [errors, setErrors] = useState<ErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getDashboardMetrics(range), getDashboardErrors(range)])
      .then(([m, e]) => {
        setMetrics(m);
        setErrors(e);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoading(false));
  }, [range]);

  return { metrics, errors, loading, error };
}
