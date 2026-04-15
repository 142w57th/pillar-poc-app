import { ok } from "@/server/http/response";
import { getStorageMode } from "@/server/storage/storage-mode";

export async function GET() {
  return ok({
    apiVersion: "v1",
    message: "Trading API scaffold is online.",
    storageMode: getStorageMode(),
  });
}
