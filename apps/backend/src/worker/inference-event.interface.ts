export interface InferenceEvent {
  requestId: string;
  conversationId: string;
  provider: string;
  model: string;
  status: 'success' | 'error';
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  ttftMs: number | null;
  errorType: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  requestedAt: string;
}
