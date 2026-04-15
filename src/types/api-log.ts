export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiLogEntry = {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  timestamp: number;
  method: HttpMethod;
  path: string;
  description?: string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
};
