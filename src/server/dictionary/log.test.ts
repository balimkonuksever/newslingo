import { afterEach, describe, expect, it, vi } from "vitest";

import { estimateCostUsd, logLookup } from "./log";

const usage = {
  model: "claude-opus-5",
  inputTokens: 1_000,
  outputTokens: 200,
  cacheCreationInputTokens: 800,
  cacheReadInputTokens: 2_000,
};

describe("estimateCostUsd", () => {
  it("prices input, cache writes, cache reads and output separately", () => {
    // 1,000 × $5 + 800 × $6.25 + 2,000 × $0.50 + 200 × $25, per million.
    expect(estimateCostUsd(usage)).toBe(0.016);
  });

  it("prices a dated model ID like its alias", () => {
    expect(
      estimateCostUsd({ ...usage, model: "claude-haiku-4-5-20251001" }),
    ).toBe(0.0032);
  });

  it("does not guess a price for an unknown model", () => {
    expect(estimateCostUsd({ ...usage, model: "claude-opus-5-5" })).toBeNull();
  });
});

describe("logLookup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON line with the outcome, timing and cost", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logLookup({
      outcome: "provider_hit",
      provider: "anthropic",
      providerVersion: "claude-opus-5+prompt-1",
      latencyMs: 1234,
      usage,
    });

    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual({
      event: "dictionary_lookup",
      outcome: "provider_hit",
      provider: "anthropic",
      providerVersion: "claude-opus-5+prompt-1",
      latencyMs: 1234,
      usage,
      estimatedCostUsd: 0.016,
    });
  });

  it("leaves out usage when there was none", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logLookup({
      outcome: "cache_hit",
      provider: "fixture",
      providerVersion: "1",
      latencyMs: 3,
    });

    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual({
      event: "dictionary_lookup",
      outcome: "cache_hit",
      provider: "fixture",
      providerVersion: "1",
      latencyMs: 3,
    });
  });
});
