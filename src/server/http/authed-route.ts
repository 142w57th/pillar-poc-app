import { NextRequest } from "next/server";

import { AuthError, type RequestUser, requireUser } from "@/server/auth/require-user";
import { runWithRequestUser } from "@/server/request-context";

import { fail } from "./response";

type ErrorHandler = (error: unknown) => Response | null;

type WithAuthedRouteOptions = {
  onError?: ErrorHandler;
  logLabel?: string;
};

export function withAuthedRoute(
  handler: (request: NextRequest, user: RequestUser) => Promise<Response>,
  options: WithAuthedRouteOptions = {},
) {
  return async function handleAuthedRoute(request: NextRequest) {
    try {
      const user = requireUser(request);
      return await runWithRequestUser(user.userId, () => handler(request, user), user.sessionId);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return fail(error.code, error.message, error.status);
      }

      const handled = options.onError?.(error) ?? null;
      if (handled) {
        return handled;
      }

      if (options.logLabel) {
        console.error(`[${options.logLabel}] Unhandled error:`, error);
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return fail("INTERNAL_SERVER_ERROR", message, 500);
    }
  };
}
