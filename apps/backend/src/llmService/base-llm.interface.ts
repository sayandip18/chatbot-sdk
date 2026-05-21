export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface BaseLLM {
  stream(prompt: string, options?: StreamOptions): AsyncIterable<string>;
}
