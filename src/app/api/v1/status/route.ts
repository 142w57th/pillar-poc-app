import { ok } from "@/server/http/response";

export async function GET() {
  return ok({
    apiVersion: "v1",
    message: "Trading API scaffold is online.",
  });
}
