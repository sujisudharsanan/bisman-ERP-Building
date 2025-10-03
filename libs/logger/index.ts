// libs/logger/index.ts
import pino from "pino";

export const logger = pino();

export function childLogger(bindings: Record<string, any> = {}) {
  return logger.child(bindings);
}
