import { afterEach, describe, expect, it, vi } from "vitest";

async function dictionaryEnv(settings: Record<string, string>) {
  const values = {
    NODE_ENV: "test",
    DICTIONARY_PROVIDER: "",
    DICTIONARY_MODEL: "",
    DICTIONARY_CACHE_ONLY: "",
    ANTHROPIC_API_KEY: "",
    ...settings,
  };

  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }

  // `env.ts` reads NODE_ENV when it loads, so load a fresh copy.
  vi.resetModules();
  const { getDictionaryEnv } = await import("./env");

  return getDictionaryEnv();
}

describe("getDictionaryEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asks no provider by default, in every environment", async () => {
    for (const NODE_ENV of ["development", "test", "production"]) {
      await expect(dictionaryEnv({ NODE_ENV })).resolves.toEqual({
        provider: "none",
        model: "claude-opus-5",
        cacheOnly: false,
        anthropicApiKey: undefined,
      });
    }
  });

  it("can use the fixture provider", async () => {
    await expect(
      dictionaryEnv({ DICTIONARY_PROVIDER: "fixture" }),
    ).resolves.toMatchObject({ provider: "fixture" });
  });

  it("reads the cache-only kill switch and a model override", async () => {
    await expect(
      dictionaryEnv({
        DICTIONARY_CACHE_ONLY: "true",
        DICTIONARY_MODEL: "claude-haiku-4-5",
      }),
    ).resolves.toMatchObject({ cacheOnly: true, model: "claude-haiku-4-5" });
  });

  it("uses Claude when configured with a key", async () => {
    await expect(
      dictionaryEnv({
        NODE_ENV: "development",
        DICTIONARY_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "test-key",
      }),
    ).resolves.toMatchObject({
      provider: "anthropic",
      anthropicApiKey: "test-key",
    });
  });

  it("requires an API key for Claude", async () => {
    await expect(
      dictionaryEnv({
        NODE_ENV: "development",
        DICTIONARY_PROVIDER: "anthropic",
      }),
    ).rejects.toThrow(
      "ANTHROPIC_API_KEY: is required when DICTIONARY_PROVIDER is anthropic",
    );
  });

  it("refuses a live provider in tests", async () => {
    await expect(
      dictionaryEnv({
        DICTIONARY_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "test-key",
      }),
    ).rejects.toThrow("must not be anthropic in tests");
  });

  it("rejects unknown settings without echoing the key", async () => {
    const error = await dictionaryEnv({
      NODE_ENV: "development",
      DICTIONARY_PROVIDER: "openai",
      DICTIONARY_CACHE_ONLY: "yes",
      ANTHROPIC_API_KEY: "secret-test-value",
    }).catch((caught: Error) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/DICTIONARY_PROVIDER/u);
    expect((error as Error).message).toMatch(/DICTIONARY_CACHE_ONLY/u);
    expect((error as Error).message).not.toContain("secret-test-value");
  });
});
