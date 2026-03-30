import { EventEmitter } from "node:events";
import type { ApiLogEntry } from "@/server/api-log/types";

const BUFFER_SIZE = 50;
const EVENT_NAME = "api-log";

type ApiLogListener = (entry: ApiLogEntry) => void;

class ApiLogBus {
  private emitter = new EventEmitter();
  private buffer: ApiLogEntry[] = [];

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(entry: ApiLogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-BUFFER_SIZE);
    }
    this.emitter.emit(EVENT_NAME, entry);
  }

  subscribe(listener: ApiLogListener) {
    this.emitter.on(EVENT_NAME, listener);
  }

  unsubscribe(listener: ApiLogListener) {
    this.emitter.off(EVENT_NAME, listener);
  }

  getBuffer(): ApiLogEntry[] {
    return [...this.buffer];
  }

  clearBuffer() {
    this.buffer = [];
  }

  get subscriberCount(): number {
    return this.emitter.listenerCount(EVENT_NAME);
  }
}

const globalKey = Symbol.for("api-log-bus");
const globalObj = globalThis as unknown as Record<symbol, ApiLogBus>;

if (!globalObj[globalKey]) {
  globalObj[globalKey] = new ApiLogBus();
}

const bus = globalObj[globalKey];

export function emitApiLog(entry: ApiLogEntry) {
  bus.emit(entry);
}

export function subscribeApiLog(listener: ApiLogListener) {
  bus.subscribe(listener);
}

export function unsubscribeApiLog(listener: ApiLogListener) {
  bus.unsubscribe(listener);
}

export function getApiLogBuffer(): ApiLogEntry[] {
  return bus.getBuffer();
}

export function clearApiLogBuffer() {
  bus.clearBuffer();
}

export function getApiLogSubscriberCount(): number {
  return bus.subscriberCount;
}
