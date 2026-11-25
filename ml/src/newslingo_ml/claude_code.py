"""One headless Claude Code call on the user's Claude plan.

Model calls go through Claude Code, `claude -p`, rather than the API, so they
run on the user's plan with no API key or bill (decision log, 2026-11-04).
Each call has a system prompt and a JSON schema for its answer, and no tools,
settings, MCP servers or skills, from an empty folder, so nothing else
reaches the model. The call's environment drops any API key, and a call
stops unless Claude Code reports that it signed in without one.

Claude Code refuses to start inside another Claude Code session, as a guard
against crashing it. That guard is never bypassed here: run the calls from
your own terminal.
"""

import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

# The only tool a call may have: the one Claude Code adds for --json-schema.
EXPECTED_TOOLS = ["StructuredOutput"]
# Failures that every later call would repeat, so a run stops at the first.
STOPPING_ERRORS = frozenset(
    {"authentication_failed", "billing_error", "rate_limit", "api_key", "unexpected_setup", "nested"}
)
API_KEY_VARIABLES = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")


class RunStopped(Exception):
    """A failure that every later call would repeat."""


@dataclass
class Call:
    """What one call answered, or how it failed, and what it used."""

    output: dict | None = None
    error: str | None = None
    detail: str | None = None
    model: str | None = None
    claude_code_version: str | None = None
    usage: dict = field(default_factory=dict)
    model_usage: dict = field(default_factory=dict)
    cost_usd: float | None = None
    duration_ms: int | None = None
    duration_api_ms: int | None = None
    num_turns: int | None = None
    wall_seconds: float | None = None
    # How much of the plan's five-hour window is used, as Claude Code reports
    # it: for watching a run, not for the log.
    plan_window_used: float | None = None


def check_not_nested() -> None:
    if os.environ.get("CLAUDECODE"):
        raise RunStopped(
            "This shell belongs to a Claude Code session, and Claude Code refuses to start inside "
            "another one. Run the command from your own terminal."
        )


def executable() -> str:
    found = shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
    if not Path(found).is_file():
        raise RunStopped("Claude Code's `claude` command was not found: install Claude Code first.")
    return found


def environment() -> dict[str, str]:
    """This process's environment without API keys, so a call can only run on
    the plan Claude Code is signed in to."""
    return {name: value for name, value in os.environ.items() if name not in API_KEY_VARIABLES}


def command(system_prompt: str, schema: dict, model: str, effort: str) -> list[str]:
    return [
        executable(),
        "--print",
        "--model",
        model,
        "--effort",
        effort,
        "--output-format",
        "stream-json",
        "--verbose",
        "--tools",
        "",
        "--no-session-persistence",
        "--setting-sources",
        "",
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--system-prompt",
        system_prompt,
        "--json-schema",
        json.dumps(schema),
    ]


def _text(message: dict) -> str:
    content = (message.get("message") or {}).get("content") or []
    return " ".join(part.get("text", "") for part in content if isinstance(part, dict))[:500]


def read_stream(lines: Iterable[str]) -> Call:
    """Reads Claude Code's stream-json output up to its result, or up to the
    first message that reports an error. With --json-schema, Claude Code keeps
    asking the model for the answer after a failed request, so the caller
    stops the process as soon as this returns."""
    call = Call()
    for line in lines:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            call.error, call.detail = "bad_output", line[:500]
            return call
        kind = message.get("type")
        if kind == "system" and message.get("subtype") == "init":
            call.model = message.get("model")
            call.claude_code_version = message.get("claude_code_version")
            if message.get("apiKeySource") != "none":
                call.error = "api_key"
                call.detail = (
                    f"Claude Code would use an API key ({message.get('apiKeySource')}), not the plan."
                )
                return call
            if message.get("tools") != EXPECTED_TOOLS or message.get("mcp_servers"):
                call.error = "unexpected_setup"
                call.detail = (
                    f"tools {message.get('tools')}, MCP servers {message.get('mcp_servers')}: "
                    f"expected {EXPECTED_TOOLS} and none"
                )
                return call
        elif kind == "assistant" and message.get("error"):
            call.error = str(message["error"])
            call.detail = _text(message)
            return call
        elif kind == "rate_limit_event":
            window = ((message.get("rate_limit_info") or {}).get("unifiedWindows") or {}).get("five_hour") or {}
            call.plan_window_used = window.get("utilization")
        elif kind == "result":
            call.usage = message.get("usage") or {}
            call.model_usage = message.get("modelUsage") or {}
            call.cost_usd = message.get("total_cost_usd")
            call.duration_ms = message.get("duration_ms")
            call.duration_api_ms = message.get("duration_api_ms")
            call.num_turns = message.get("num_turns")
            output = message.get("structured_output")
            if message.get("is_error") or message.get("subtype") != "success":
                call.error = str(message.get("subtype") or "error")
                call.detail = str(message.get("result"))[:500]
            elif not isinstance(output, dict):
                call.error = "no_structured_output"
                call.detail = str(message.get("result"))[:500]
            else:
                call.output = output
            return call
    call.error = "no_result"
    return call


def run(
    system_prompt: str, message: str, schema: dict, model: str, effort: str, timeout: float
) -> Call:
    """Sends one message and returns the answer, stopping the process after
    `timeout` seconds."""
    started = time.monotonic()
    timed_out = threading.Event()
    with (
        tempfile.TemporaryDirectory(prefix="newslingo-claude-") as folder,
        tempfile.TemporaryFile(mode="w+") as errors,
    ):
        process = subprocess.Popen(
            command(system_prompt, schema, model, effort),
            cwd=folder,
            env=environment(),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=errors,
            text=True,
        )

        def stop() -> None:
            timed_out.set()
            process.kill()

        timer = threading.Timer(timeout, stop)
        timer.start()
        try:
            # The message goes on stdin, so no sentence is ever read as an option.
            try:
                process.stdin.write(message)
                process.stdin.close()
            except BrokenPipeError:
                pass  # It exited at once; its output and error say why.
            call = read_stream(process.stdout)
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.wait()
            errors.seek(0)
            stderr = errors.read()
    if timed_out.is_set() and call.output is None:
        call.error, call.detail = "timeout", f"no answer within {timeout:g} seconds"
    elif call.error == "no_result":
        call.detail = f"exit code {process.returncode}: {stderr.strip()[-500:]}"
        if "inside another Claude Code session" in stderr:
            call.error = "nested"
    call.wall_seconds = round(time.monotonic() - started, 3)
    return call
