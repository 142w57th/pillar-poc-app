import {
  subscribeApiLog,
  unsubscribeApiLog,
  getApiLogBuffer,
  clearApiLogBuffer,
} from "@/server/api-log/event-bus";
import type { ApiLogEntry } from "@/server/api-log/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldClear = url.searchParams.get("clear") === "1";

  if (shouldClear) {
    clearApiLogBuffer();
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (entry: ApiLogEntry) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        } catch {
          // stream closed
        }
      };

      const buffered = getApiLogBuffer();
      for (const entry of buffered) {
        send(entry);
      }

      subscribeApiLog(send);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        unsubscribeApiLog(send);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE() {
  clearApiLogBuffer();
  return new Response(null, { status: 204 });
}
