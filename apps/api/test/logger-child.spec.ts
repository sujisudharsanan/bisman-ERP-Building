import { childLogger } from "@libs/logger";

describe("logger child", () => {
  test("childLogger returns a child logger with info function and accepts bindings", () => {
    const child = childLogger({ module: "test" });
    expect(child).toBeDefined();
    // Pino child logger exposes info
    expect(typeof (child as any).info).toBe("function");
    // calling info should not throw
    expect(() => (child as any).info({ hello: "world" }, "test message")).not.toThrow();
  });
});
