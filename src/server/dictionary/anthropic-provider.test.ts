// @vitest-environment node
import {
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import {
  createAnthropicDictionaryProvider,
  DICTIONARY_SYSTEM_PROMPT,
  type MessagesClient,
} from "./anthropic-provider";
import { DictionaryProviderError } from "./provider";

const answer = {
  lemma: "rise",
  partOfSpeech: "verb",
  englishDefinition: "To go up or become higher.",
  turkishMeaning: "artmak, yükselmek",
  exampleSentence: "Prices rise every winter.",
  ipa: "/raɪz/",
};

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text: JSON.stringify(answer) }],
    stop_reason: "end_turn",
    stop_details: null,
    usage: {
      input_tokens: 40,
      output_tokens: 90,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 700,
      iterations: null,
    },
    ...overrides,
  };
}

function providerReturning(result: unknown) {
  const create = vi.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  });
  const provider = createAnthropicDictionaryProvider({
    model: "claude-opus-5",
    client: { create } as unknown as MessagesClient,
  });

  return { provider, create };
}

const input = { word: "rise", context: "Costs will ⟦rise⟧ next year." };

async function lookupError(result: unknown) {
  const { provider } = providerReturning(result);
  const error = await provider.lookup(input).catch((caught) => caught);

  expect(error).toBeInstanceOf(DictionaryProviderError);
  return error as DictionaryProviderError;
}

describe("the Claude dictionary provider", () => {
  it("names the model and prompt version in its cache namespace", () => {
    const { provider } = providerReturning(message());

    expect(provider.name).toBe("anthropic");
    expect(provider.version).toBe("claude-opus-5+prompt-2");
  });

  it("asks for a structured answer about the marked word", async () => {
    const { provider, create } = providerReturning(message());

    await provider.lookup(input);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5",
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: expect.objectContaining({
          effort: "low",
          format: expect.objectContaining({ type: "json_schema" }),
        }),
        system: [
          {
            type: "text",
            text: DICTIONARY_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content:
              "<word>rise</word>\n<sentence>Costs will ⟦rise⟧ next year.</sentence>",
          },
        ],
      }),
    );
  });

  it("keeps the system prompt above the 512-token caching minimum", () => {
    // A conservative estimate: English averages more than one token per
    // four characters.
    expect(DICTIONARY_SYSTEM_PROMPT.length / 4).toBeGreaterThan(600);
  });

  it("returns the parsed answer with its token usage", async () => {
    const { provider } = providerReturning(message());

    await expect(provider.lookup(input)).resolves.toEqual({
      output: answer,
      usage: {
        model: "claude-opus-5",
        inputTokens: 40,
        outputTokens: 90,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 700,
      },
    });
  });

  it("records the fallback model when one answered", async () => {
    const { provider } = providerReturning(
      message({
        usage: {
          input_tokens: 40,
          output_tokens: 90,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          iterations: [
            {
              type: "fallback_message",
              model: "claude-opus-4-8",
              input_tokens: 40,
              output_tokens: 90,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              cache_creation: null,
            },
          ],
        },
      }),
    );

    const { usage } = await provider.lookup(input);

    expect(usage).toMatchObject({
      model: "claude-opus-4-8",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
  });

  it("reports a refusal without reading the content", async () => {
    const error = await lookupError(
      message({
        content: [],
        stop_reason: "refusal",
        stop_details: { type: "refusal", category: "cyber", explanation: null },
      }),
    );

    expect(error.kind).toBe("refused");
    expect(error.message).toContain("cyber");
    expect(error.usage?.inputTokens).toBe(40);
  });

  it("rejects an answer cut off by the token limit", async () => {
    const error = await lookupError(
      message({
        content: [{ type: "text", text: '{"lemma": "ri' }],
        stop_reason: "max_tokens",
      }),
    );

    expect(error.kind).toBe("invalid_output");
  });

  it("rejects an answer that is not JSON", async () => {
    const error = await lookupError(
      message({ content: [{ type: "text", text: "Rise means to go up." }] }),
    );

    expect(error.kind).toBe("invalid_output");
    expect(error.usage?.outputTokens).toBe(90);
  });

  it.each([
    [
      "a rate limit",
      new RateLimitError(429, undefined, "rate limited", new Headers()),
      "rate_limited",
    ],
    ["a timeout", new APIConnectionTimeoutError(), "unavailable"],
    [
      "an overloaded API",
      new InternalServerError(529, undefined, "overloaded", new Headers()),
      "unavailable",
    ],
    [
      "a rejected API key",
      new AuthenticationError(401, undefined, "invalid key", new Headers()),
      "unavailable",
    ],
  ])("maps %s to %s", async (_, sdkError, kind) => {
    const error = await lookupError(sdkError);

    expect(error.kind).toBe(kind);
    expect(error.cause).toBe(sdkError);
  });
});
