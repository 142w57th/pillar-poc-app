import { ok } from "@/server/http/response";

export async function GET() {
  return ok({
    service: "pillar-poc-app",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
