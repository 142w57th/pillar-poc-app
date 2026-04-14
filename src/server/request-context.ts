import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  userId: string | null;
  sessionId: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

function resolveSessionId(sessionId: string | null | undefined) {
  const current = storage.getStore();
  return sessionId ?? current?.sessionId ?? null;
}

export function runWithRequestUser<T>(userId: string | null, run: () => T, sessionId?: string | null): T {
  return storage.run(
    {
      userId,
      sessionId: resolveSessionId(sessionId),
    },
    run,
  );
}

export function getRequestUserId() {
  return storage.getStore()?.userId ?? null;
}

export function getRequestSessionId() {
  return storage.getStore()?.sessionId ?? null;
}
