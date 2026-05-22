import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InferenceMetricsRollup } from '../entities/inference-metrics-rollup.entity';
import { InferenceError } from '../entities/inference-error.entity';

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

function classifyErrorCategory(
  errorType: string,
  httpStatus: number | null,
): string {
  if (errorType === 'rate_limit') return 'Rate Limit';
  if (errorType === 'timeout') return 'Timeout';
  if (errorType === 'quota_exceeded') return 'Quota Exceeded';
  if (errorType === 'context_length') return 'Context Length';
  if (httpStatus !== null && httpStatus >= 500) return 'Provider Error';
  return 'Other';
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(InferenceMetricsRollup)
    private readonly rollupRepo: Repository<InferenceMetricsRollup>,
    @InjectRepository(InferenceError)
    private readonly errorRepo: Repository<InferenceError>,
  ) {}

  async getMetrics(hours: number): Promise<{ timeSeries: MetricsBucket[] }> {
    const rows: Record<string, number | string | null>[] =
      await this.rollupRepo.query(
        `
      SELECT
        bucket_timestamptz                                                              AS "bucketTs",
        SUM(total_requests)::int                                                        AS "totalRequests",
        SUM(failed_requests)::int                                                       AS "failedRequests",
        SUM(total_input_tokens)::int                                                    AS "totalInputTokens",
        SUM(total_output_tokens)::int                                                   AS "totalOutputTokens",
        ROUND(SUM(COALESCE(p50_latency_ms, 0) * total_requests)::numeric
              / NULLIF(SUM(total_requests), 0))::int                                    AS "p50LatencyMs",
        ROUND(SUM(COALESCE(p90_latency_ms, 0) * total_requests)::numeric
              / NULLIF(SUM(total_requests), 0))::int                                    AS "p90LatencyMs",
        ROUND(SUM(COALESCE(p99_latency_ms, 0) * total_requests)::numeric
              / NULLIF(SUM(total_requests), 0))::int                                    AS "p99LatencyMs",
        ROUND(SUM(COALESCE(avg_ttft_ms, 0) * total_requests)::numeric
              / NULLIF(SUM(total_requests), 0))::int                                    AS "avgTtftMs"
      FROM inference_metrics_rollup
      WHERE bucket_timestamptz >= NOW() - make_interval(hours => $1)
      GROUP BY bucket_timestamptz
      ORDER BY bucket_timestamptz ASC
      `,
        [hours],
      );

    const timeSeries: MetricsBucket[] = rows.map((row) => {
      const total = (row['totalRequests'] as number) ?? 0;
      const failed = (row['failedRequests'] as number) ?? 0;
      return {
        bucketTs: row['bucketTs'] as string,
        totalRequests: total,
        failedRequests: failed,
        errorRatePct: total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
        avgTtftMs: row['avgTtftMs'] as number | null,
        p50LatencyMs: row['p50LatencyMs'] as number | null,
        p90LatencyMs: row['p90LatencyMs'] as number | null,
        p99LatencyMs: row['p99LatencyMs'] as number | null,
        inputTps: Math.round(((row['totalInputTokens'] as number) ?? 0) / 60),
        outputTps: Math.round(((row['totalOutputTokens'] as number) ?? 0) / 60),
      };
    });

    return { timeSeries };
  }

  async getErrorBreakdown(
    hours: number,
  ): Promise<{ breakdown: ErrorCategory[] }> {
    const rows: {
      errorType: string;
      httpStatus: number | null;
      count: number;
    }[] = await this.errorRepo.query(
      `
      SELECT error_type AS "errorType", http_status AS "httpStatus", COUNT(*)::int AS count
      FROM inference_errors
      WHERE timestamp >= NOW() - make_interval(hours => $1)
      GROUP BY error_type, http_status
      `,
      [hours],
    );

    const categoryMap = new Map<string, number>();
    for (const row of rows) {
      const cat = classifyErrorCategory(row.errorType, row.httpStatus);
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + row.count);
    }

    const breakdown: ErrorCategory[] = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return { breakdown };
  }
}
