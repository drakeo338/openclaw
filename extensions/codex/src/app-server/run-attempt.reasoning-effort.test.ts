import { createDeferred } from "openclaw/plugin-sdk/extension-shared";
import type { ModelCompatConfig } from "openclaw/plugin-sdk/provider-model-types";
import {
  closeOpenClawAgentDatabasesAsync,
  closeOpenClawStateDatabaseAsync,
  drainSessionDiskBudgetWorkers,
} from "openclaw/plugin-sdk/sqlite-runtime-testing";
import { beforeAll, describe, expect, it, type TestContext } from "vitest";
import {
  createStartedThreadHarness,
  createTestParams,
  runCodexAppServerAttempt,
  setupRunAttemptTestHooks,
  threadStartResult,
  turnStartResult,
} from "./run-attempt-test-harness.js";

let readWorkerPools: NonNullable<TestContext["codexAttemptRuntime"]>["readWorkerPools"] | undefined;

beforeAll(() => {
  // Logical pools are fixture-owned; the shared native supervisor is process-owned.
  return async () => {
    try {
      expect(readWorkerPools?.()).toMatchObject({ workerPoolCount: 0, workerPools: [] });
    } finally {
      await drainSessionDiskBudgetWorkers();
      await closeOpenClawAgentDatabasesAsync();
      await closeOpenClawStateDatabaseAsync();
    }
  };
});

setupRunAttemptTestHooks();

describe("Codex reasoning effort across completed turns", () => {
  it("changes high to off on the same Platform thread", async (context) => {
    const runtime = context.codexAttemptRuntime;
    if (!runtime) {
      throw new Error("Codex run-attempt tests require the shared extension runtime fixture");
    }
    readWorkerPools = runtime.readWorkerPools;
    context.onTestFinished(() => {
      expect(runtime.readWorkerPools().workerPoolCount).toBeGreaterThan(0);
    });
    let turnCount = 0;
    let turnStarted = createDeferred<void>();
    const harness = createStartedThreadHarness(async (method) => {
      if (method === "thread/resume") {
        return threadStartResult();
      }
      if (method === "turn/start") {
        const result = turnStartResult(`turn-${++turnCount}`);
        turnStarted.resolve();
        return result;
      }
      return undefined;
    });
    const params = createTestParams();
    const compat: ModelCompatConfig = {
      supportsTools: false,
      supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
    };
    params.provider = "openai";
    params.modelId = "gpt-5.6-luna";
    params.model = {
      ...params.model,
      provider: "openai",
      id: params.modelId,
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      compat,
    };

    for (const [index, thinkLevel] of (["high", "off"] as const).entries()) {
      turnStarted = createDeferred<void>();
      const run = runCodexAppServerAttempt({
        ...params,
        thinkLevel,
        runId: `run-${index + 1}`,
      });
      await Promise.race([turnStarted.promise, run]);
      expect(turnCount).toBe(index + 1);
      await harness.completeTurn({ threadId: "thread-1", turnId: `turn-${index + 1}` });
      await run;
    }

    expect(harness.requests.filter(({ method }) => method === "thread/start")).toHaveLength(1);
    const turnRequests = harness.requests.filter(({ method }) => method === "turn/start");
    expect(turnRequests.map(({ params: request }) => request)).toMatchObject([
      {
        threadId: "thread-1",
        effort: "high",
        collaborationMode: { settings: { reasoning_effort: "high" } },
      },
      {
        threadId: "thread-1",
        effort: "none",
        collaborationMode: { settings: { reasoning_effort: "none" } },
      },
    ]);
  });
});
