const BASE = '/api';

export interface MetricsBucket {
  bucketTs: string;
  totalRequests: number;
  failedRequests: number;
  errorRatePct: number;
  avgTtftMs: number | null;
  p50LatencyMs: number | null;
  p90LatencyMs: number | null;
  p99LatencyMs: number | null;
  inputTps: number;
  outputTps: number;
}

export interface ErrorCategory {
  category: string;
  count: number;
}

export interface MetricsResponse {
  timeSeries: MetricsBucket[];
}

export interface ErrorsResponse {
  breakdown: ErrorCategory[];
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function getDashboardMetrics(range: string): Promise<MetricsResponse> {
  return request(`/dashboard/metrics?range=${range}`);
}

export function getDashboardErrors(range: string): Promise<ErrorsResponse> {
  return request(`/dashboard/errors?range=${range}`);
}
