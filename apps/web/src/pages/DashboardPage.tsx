import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { InfoCard, Spinner, BodySmRegular20, cn } from '@app/ui';
import { useDashboard } from '../hooks/useDashboard';
import type { MetricsBucket } from '../api/dashboard';

type Range = '1h' | '6h' | '24h';
const RANGES: Range[] = ['1h', '6h', '24h'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function tickInterval(data: MetricsBucket[]): number {
  if (data.length <= 60) return 9;
  if (data.length <= 360) return 59;
  return 119;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-600 mb-3">{title}</p>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<Range>('1h');
  const { metrics, errors, loading, error } = useDashboard(range);
  const navigate = useNavigate();

  const ts = metrics?.timeSeries ?? [];
  const interval = tickInterval(ts);

  return (
    <InfoCard title="Dashboard" className="w-full max-h-full h-full overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Chat
        </button>
        <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              r === range
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {r}
          </button>
        ))}
        </div>
      </div>

      {error && (
        <BodySmRegular20 className="text-red-500 py-4">{error}</BodySmRegular20>
      )}

      {loading ? (
        <div className="flex justify-center pt-20">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          <ChartCard title="Time to First Token (ms)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucketTs"
                  tickFormatter={formatTime}
                  interval={interval}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(label) => formatTime(label as string)}
                  formatter={(v) => [`${v as number} ms`, 'TTFT']}
                />
                <Line
                  type="monotone"
                  dataKey="avgTtftMs"
                  stroke="#8b5cf6"
                  dot={false}
                  strokeWidth={2}
                  name="TTFT"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Latency Percentiles (ms)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucketTs"
                  tickFormatter={formatTime}
                  interval={interval}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(label) => formatTime(label as string)} formatter={(v) => [`${v as number} ms`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="p50LatencyMs" stroke="#3b82f6" dot={false} strokeWidth={2} name="p50" connectNulls />
                <Line type="monotone" dataKey="p90LatencyMs" stroke="#f59e0b" dot={false} strokeWidth={2} name="p90" connectNulls />
                <Line type="monotone" dataKey="p99LatencyMs" stroke="#ef4444" dot={false} strokeWidth={2} name="p99" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Requests per Minute">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucketTs"
                  tickFormatter={formatTime}
                  interval={interval}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(label) => formatTime(label as string)} formatter={(v) => [v as number, 'Requests']} />
                <Bar dataKey="totalRequests" fill="#3b82f6" name="Requests" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tokens per Second">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucketTs"
                  tickFormatter={formatTime}
                  interval={interval}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(label) => formatTime(label as string)} formatter={(v) => [`${v as number} tok/s`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inputTps" stroke="#10b981" dot={false} strokeWidth={2} name="Input" />
                <Line type="monotone" dataKey="outputTps" stroke="#06b6d4" dot={false} strokeWidth={2} name="Output" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Error Rate (%)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bucketTs"
                  tickFormatter={formatTime}
                  interval={interval}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(label) => formatTime(label as string)}
                  formatter={(v) => [`${v as number}%`, 'Error Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="errorRatePct"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                  name="Error Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Error Breakdown">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={errors?.breakdown ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v as number, 'Errors']} />
                <Bar dataKey="count" fill="#f87171" name="Errors" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </InfoCard>
  );
}
