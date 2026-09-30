import "server-only";

import { getDictionaryEnv } from "@/lib/env";
import { createAnthropicDictionaryProvider } from "@/server/dictionary/anthropic-provider";
import { fixtureDictionaryProvider } from "@/server/dictionary/fixture-provider";
import type { LookupDependencies } from "@/server/dictionary/lookup";
import { createRateLimiter } from "@/server/dictionary/rate-limit";

let configured: LookupDependencies | undefined;

/**
 * The provider and limits chosen by the environment, created on the first
 * lookup. Changing the environment needs a server restart.
 */
export function getLookupDependencies(): LookupDependencies {
  if (!configured) {
    const settings = getDictionaryEnv();

    configured = {
      provider:
        settings.provider === "anthropic"
          ? createAnthropicDictionaryProvider({
              model: settings.model,
              apiKey: settings.anthropicApiKey,
            })
          : settings.provider === "fixture"
            ? fixtureDictionaryProvider
            : null,
      cacheOnly: settings.cacheOnly,
      // Caps new provider calls per server process, whoever asks.
      providerLimiter: createRateLimiter({ limit: 60, windowMs: 60_000 }),
    };
  }

  return configured;
}
