import json
import sys

import pytest

from newslingo_ml import claude_code

INIT = {
    "type": "system",
    "subtype": "init",
    "tools": ["StructuredOutput"],
    "mcp_servers": [],
    "model": "claude-opus-5-5",
    "apiKeySource": "none",
    "claude_code_version": "2.1.74",
}
RESULT = {
    "type": "result",
    "subtype": "success",
    "is_error": False,
    "duration_ms": 5123,
    "duration_api_ms": 4800,
    "num_turns": 2,
    "result": "",
    "total_cost_usd": 0.0123,
    "usage": {
        "input_tokens": 10,
        "cache_creation_input_tokens": 900,
        "cache_read_input_tokens": 0,
        "output_tokens": 120,
    },
    "modelUsage": {"claude-opus-5-5": {"inputTokens": 10, "outputTokens": 120, "costUSD": 0.0123}},
    "structured_output": {"level": "B1"},
}
# As Claude Code 2.1.74 printed it on 2026-11-25 when its sign-in had expired.
AUTH_FAILURE = {
    "type": "assistant",
    "message": {
        "model": "<synthetic>",
        "role": "assistant",
        "content": [{"type": "text", "text": "Failed to authenticate. API Error: 401"}],
    },
    "error": "authentication_failed",
}
NUDGE = {
    "type": "user",
    "message": {"role": "user", "content": [{"type": "text", "text": "You MUST call the StructuredOutput tool"}]},
}


def lines(*messages: dict) -> list[str]:
    return [json.dumps(message) + "\n" for message in messages]


# As Claude Code 2.1.332 printed it on 2026-11-25, trimmed.
WINDOW = {
    "type": "rate_limit_event",
    "rate_limit_info": {"status": "allowed", "unifiedWindows": {"five_hour": {"utilization": 0.15}}},
}


def test_read_stream_returns_the_answer_and_what_it_used():
    call = claude_code.read_stream(lines(INIT, WINDOW, RESULT))
    assert call.plan_window_used == 0.15
    assert call.error is None
    assert call.output == {"level": "B1"}
    assert call.model == "claude-opus-5-5"
    assert call.claude_code_version == "2.1.74"
    assert call.usage["output_tokens"] == 120
    assert call.cost_usd == 0.0123
    assert call.duration_api_ms == 4800


def test_read_stream_stops_at_the_first_error():
    # After a failed request Claude Code keeps asking for the answer, so the
    # stream would go on; reading must stop at the first error.
    stream = iter(lines(INIT, AUTH_FAILURE, NUDGE, AUTH_FAILURE, NUDGE))
    call = claude_code.read_stream(stream)
    assert call.error == "authentication_failed"
    assert call.error in claude_code.STOPPING_ERRORS
    assert "401" in call.detail
    assert len(list(stream)) == 3


def test_read_stream_refuses_an_api_key():
    call = claude_code.read_stream(lines({**INIT, "apiKeySource": "ANTHROPIC_API_KEY"}, RESULT))
    assert call.error == "api_key"
    assert call.output is None
    assert call.error in claude_code.STOPPING_ERRORS


def test_read_stream_refuses_tools_beyond_the_answer():
    call = claude_code.read_stream(lines({**INIT, "tools": ["Bash", "StructuredOutput"]}, RESULT))
    assert call.error == "unexpected_setup"
    call = claude_code.read_stream(lines({**INIT, "mcp_servers": [{"name": "x"}]}, RESULT))
    assert call.error == "unexpected_setup"


def test_read_stream_reports_a_result_without_an_answer():
    call = claude_code.read_stream(lines(INIT, {**RESULT, "structured_output": None}))
    assert call.error == "no_structured_output"
    call = claude_code.read_stream(lines(INIT, {**RESULT, "subtype": "error_max_turns", "is_error": True}))
    assert call.error == "error_max_turns"
    assert claude_code.read_stream(lines(INIT)).error == "no_result"


def test_environment_drops_api_keys(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "not-a-real-key")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "not-a-real-token")
    monkeypatch.setenv("NEWSLINGO_TEST_VARIABLE", "kept")
    environment = claude_code.environment()
    assert "ANTHROPIC_API_KEY" not in environment
    assert "ANTHROPIC_AUTH_TOKEN" not in environment
    assert environment["NEWSLINGO_TEST_VARIABLE"] == "kept"


def test_command_turns_off_tools_settings_mcp_and_skills(monkeypatch):
    monkeypatch.setattr(claude_code, "executable", lambda: "/bin/claude")
    command = claude_code.command("Rate it.", {"type": "object"}, "claude-opus-5-5", "high")
    assert command[:2] == ["/bin/claude", "--print"]

    def value(flag: str) -> str:
        return command[command.index(flag) + 1]

    assert value("--tools") == ""
    assert value("--setting-sources") == ""
    assert value("--system-prompt") == "Rate it."
    assert json.loads(value("--json-schema")) == {"type": "object"}
    assert value("--model") == "claude-opus-5-5"
    assert value("--effort") == "high"
    for flag in ("--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence"):
        assert flag in command
    # The message goes on stdin, never as an argument.
    assert command[-1] == json.dumps({"type": "object"})


def test_check_not_nested_refuses_a_claude_code_shell(monkeypatch):
    monkeypatch.setenv("CLAUDECODE", "1")
    with pytest.raises(claude_code.RunStopped):
        claude_code.check_not_nested()
    monkeypatch.delenv("CLAUDECODE")
    claude_code.check_not_nested()


def fake_claude(tmp_path, body: str) -> str:
    """A stand-in for the `claude` command: a Python script that reads the
    message on stdin and prints a stream."""
    script = tmp_path / "claude"
    script.write_text(f"#!{sys.executable} -I\nimport json, sys, time\nmessage = sys.stdin.read()\n{body}\n")
    script.chmod(0o755)
    return str(script)


def test_run_sends_the_message_on_stdin_and_reads_the_answer(tmp_path, monkeypatch):
    seen = tmp_path / "seen.txt"
    body = (
        f"open({str(seen)!r}, 'w').write(message)\n"
        f"print(json.dumps({INIT!r}))\n"
        f"print(json.dumps({RESULT!r}))"
    )
    monkeypatch.setattr(claude_code, "executable", lambda: fake_claude(tmp_path, body))
    call = claude_code.run("Rate it.", "<sentence>-x</sentence>", {}, "claude-opus-5-5", "high", timeout=30)
    assert call.error is None
    assert call.output == {"level": "B1"}
    assert seen.read_text() == "<sentence>-x</sentence>"
    assert call.wall_seconds is not None


def test_run_stops_a_call_that_takes_too_long(tmp_path, monkeypatch):
    body = f"print(json.dumps({INIT!r}), flush=True)\ntime.sleep(30)"
    monkeypatch.setattr(claude_code, "executable", lambda: fake_claude(tmp_path, body))
    call = claude_code.run("Rate it.", "<sentence>x</sentence>", {}, "claude-opus-5-5", "high", timeout=1)
    assert call.error == "timeout"
    assert call.wall_seconds < 10


def test_run_recognises_claude_codes_refusal_to_nest(tmp_path, monkeypatch):
    body = (
        "sys.stderr.write('Error: Claude Code cannot be launched inside another Claude Code session.')\n"
        "sys.exit(1)"
    )
    monkeypatch.setattr(claude_code, "executable", lambda: fake_claude(tmp_path, body))
    call = claude_code.run("Rate it.", "<sentence>x</sentence>", {}, "claude-opus-5-5", "high", timeout=30)
    assert call.error == "nested"
    assert call.error in claude_code.STOPPING_ERRORS
