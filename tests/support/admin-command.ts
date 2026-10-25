import { spawn } from "node:child_process";

import { authenticatorCode } from "./sign-in";

// Runs the admin command as an admin would, answering each prompt when it
// appears. The integration tests and the browser tests' setup share it.

/** An answer, or a way to work one out from what the command has printed. */
export type Answer = string | ((output: string) => string);

/** The setup key the command printed last. */
export function setupKeyFrom(output: string) {
  const key = [...output.matchAll(/Setup key: ([A-Z2-7 ]+)/g)].at(-1)?.[1];

  return key?.replace(/ /g, "") ?? "";
}

/** The code an authenticator app shows for the setup key printed last. */
export function codeFromApp(output: string) {
  return authenticatorCode(setupKeyFrom(output));
}

/** The backup codes the command printed last. */
export function backupCodesFrom(output: string) {
  const list = output.split("Keep these backup codes").at(-1) ?? "";

  return [...list.matchAll(/^ {2}(\w{5}-\w{5})$/gm)].map(([, code]) => code);
}

/**
 * Runs `scripts/admin-account.ts` the way `pnpm admin:create` and
 * `pnpm admin:reset` do, answering prompts in order. When the answers run
 * out, the input ends. DATABASE_URL in `env` must name the test database.
 */
export function runAdminCommand(
  action: "create" | "reset",
  answers: Answer[],
  env: NodeJS.ProcessEnv = process.env,
) {
  const child = spawn(
    "node_modules/.bin/tsx",
    ["--conditions=react-server", "scripts/admin-account.ts", action],
    { env },
  );
  const pending = [...answers];
  let output = "";
  let answeredAt = 0;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stdout.on("data", (chunk: string) => {
    output += chunk;

    // A prompt is the last thing printed, ending in ": ", until it is answered.
    if (output.length > answeredAt && output.endsWith(": ")) {
      const answer = pending.shift();
      answeredAt = output.length;

      if (answer === undefined) {
        child.stdin.end();
      } else {
        child.stdin.write(
          `${typeof answer === "function" ? answer(output) : answer}\n`,
        );
      }
    }
  });

  return new Promise<{ exitCode: number | null; output: string }>((resolve) => {
    child.on("close", (exitCode) => resolve({ exitCode, output }));
  });
}
