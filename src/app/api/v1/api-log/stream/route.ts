import { NextRequest } from "next/server";

import {
  subscribeApiLog,
  unsubscribeApiLog,
  getApiLogBufferByIdentity,
  clearApiLogBufferByIdentity,
} from "@/server/api-log/event-bus";
import { AuthError, requireUser } from "@/server/auth/require-user";
import type { ApiLogEntry } from "@/server/api-log/types";
import { fail } from "@/server/http/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let userId: string;
  let sessionId: string;
  try {
    const user = requireUser(request);
    userId = user.userId;
    sessionId = user.sessionId;
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return fail(error.code, error.message, error.status);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }

  const url = new URL(request.url);
  const shouldClear = url.searchParams.get("clear") === "1";

  if (shouldClear) {
    clearApiLogBufferByIdentity(userId, sessionId);
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const closeStream = () => {
        if (closed) {
          return;
        }
        closed = true;
        unsubscribeApiLog(send);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const send = (entry: ApiLogEntry) => {
        if (entry.userId !== userId || entry.sessionId !== sessionId) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        } catch {
          closeStream();
        }
      };

      const buffered = getApiLogBufferByIdentity(userId, sessionId);
      for (const entry of buffered) {
        send(entry);
      }

      subscribeApiLog(send);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          closeStream();
        }
      }, 15_000);

      request.signal.addEventListener("abort", closeStream, { once: true });
      cleanup = closeStream;
    },
    cancel() {
      // Defensive cleanup in runtimes where stream cancellation may happen before abort.
      cleanup?.();
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

export async function DELETE(request: NextRequest) {
  try {
    const user = requireUser(request);
    clearApiLogBufferByIdentity(user.userId, user.sessionId);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return fail(error.code, error.message, error.status);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_SERVER_ERROR", message, 500);
  }
  return new Response(null, { status: 204 });
}
