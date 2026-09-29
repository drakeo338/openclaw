import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { expect, it } from "vitest";

type BrowserHostModule = {
  getDefaultAiTransportHost(): unknown;
  runWithAiTransportHost<T>(host: unknown, run: () => T): T;
};

it("keeps the default transport host usable in browser bundles", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./host.ts", import.meta.url))],
    bundle: true,
    format: "iife",
    globalName: "OpenClawAiHost",
    logLevel: "silent",
    platform: "browser",
    write: false,
  });

  expect(result.errors).toEqual([]);
  const context: {
    OpenClawAiHost?: BrowserHostModule;
    TextDecoder: typeof TextDecoder;
    TextEncoder: typeof TextEncoder;
  } = {
    TextDecoder,
    TextEncoder,
  };
  runInNewContext(result.outputFiles[0]?.text ?? "", context);
  const browserHost = context.OpenClawAiHost;
  if (!browserHost) {
    throw new Error("browser bundle did not expose its host contract");
  }
  expect(
    browserHost.runWithAiTransportHost(browserHost.getDefaultAiTransportHost(), () => "ok"),
  ).toBe("ok");
});
