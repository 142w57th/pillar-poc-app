export type ApiLogEntry = {
  id: string;
  timestamp: number;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description?: string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
};
