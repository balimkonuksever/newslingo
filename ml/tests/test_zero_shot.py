import json

import pytest

from newslingo_ml import claude_code, zero_shot
from newslingo_ml.corpus import Sentence

SENTENCES = [Sentence(f"Sentence number {n} , with a comma .", 3, 4) for n in range(6)]
PROMPT_DIGEST = "f" * 64


def answered(*levels: str) -> claude_code.Call:
    return claude_code.Call(
        output={"levels": [{"id": number, "level": level} for number, level in enumerate(levels, 1)]},
        model="claude-opus-5-5",
        claude_code_version="2.1.74",
        usage={
            "input_tokens": 10,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 900,
            "output_tokens": 50,
        },
        model_usage={
            "claude-opus-5-5": {"inputTokens": 10, "outputTokens": 50, "costUSD": 0.01, "contextWindow": 1}
        },
        cost_usd=0.01,
        duration_ms=4000,
        duration_api_ms=3500,
        num_turns=2,
        wall_seconds=4.5,
    )


def failed(error: str = "timeout") -> claude_code.Call:
    return claude_code.Call(error=error, detail="it went wrong", wall_seconds=300)


def entry(batch: int, indices: list[int], call: claude_code.Call, **changes) -> dict:
    sentences = changes.get("sentences", SENTENCES)
    prompt_digest = changes.get("prompt_digest", PROMPT_DIGEST)
    return zero_shot.record("dev", batch, indices, sentences, prompt_digest, "2026-11-25T19:00:00+00:00", call)


def test_batches_cut_a_fixed_permutation():
    found = zero_shot.batches(45)
    assert found == zero_shot.batches(45)
    assert [len(batch) for batch in found] == [20, 20, 5]
    order = [index for batch in found for index in batch]
    assert sorted(order) == list(range(45))
    assert order != list(range(45))


def test_message_numbers_the_detokenized_sentences():
    assert zero_shot.message([Sentence("It did n't rain .", 2, 2), Sentence("Yes , it did .", 1, 1)]) == (
        '<sentence id="1">It didn\'t rain.</sentence>\n<sentence id="2">Yes, it did.</sentence>'
    )


def test_read_levels_puts_the_answer_in_sentence_order():
    output = {"levels": [{"id": 2, "level": "C1"}, {"id": 1, "level": "A2"}]}
    assert zero_shot.read_levels(output, 2) == ["A2", "C1"]


@pytest.mark.parametrize(
    "output",
    [
        {"levels": [{"id": 1, "level": "A2"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 1, "level": "B1"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 2, "level": "B1"}, {"id": 1, "level": "C1"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 3, "level": "B1"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 2, "level": "B3"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 2, "level": "B1", "why": "long"}]},
        {"levels": [{"id": 1, "level": "A2"}, {"id": 2, "level": "B1"}], "note": "x"},
        None,
    ],
)
def test_read_levels_refuses_anything_but_one_level_for_each_sentence(output):
    assert zero_shot.read_levels(output, 2) is None


def test_record_keeps_sentences_by_digest_never_their_text():
    kept = entry(0, [4, 2], answered("B2", "A1"))
    assert kept["levels"] == ["B2", "A1"]
    assert kept["error"] is None
    assert kept["text_sha256"] == [zero_shot.digest(SENTENCES[i].text)[:16] for i in (4, 2)]
    assert "comma" not in json.dumps(kept)
    assert kept["model_usage"]["claude-opus-5-5"] == {
        "inputTokens": 10,
        "outputTokens": 50,
        "cacheCreationInputTokens": None,
        "cacheReadInputTokens": None,
        "thinkingTokens": None,
        "costUSD": 0.01,
    }


def test_record_marks_an_incomplete_answer_invalid():
    kept = entry(0, [4, 2], answered("B2"))
    assert kept["error"] == "invalid_output"
    assert kept["levels"] is None
    assert kept["output"] == {"levels": [{"id": 1, "level": "B2"}]}


def test_answers_take_the_first_answer_and_skip_failures():
    records = [
        entry(0, [1, 3], failed()),
        entry(0, [1, 3], answered("A2", "C2")),
        entry(0, [1, 3], answered("C1", "C1")),
    ]
    assert zero_shot.answers(records, SENTENCES, PROMPT_DIGEST) == {1: 2, 3: 6}


def test_answers_refuse_a_log_from_another_prompt():
    with pytest.raises(SystemExit):
        zero_shot.answers([entry(0, [0], answered("B1"), prompt_digest="0" * 64)], SENTENCES, PROMPT_DIGEST)


def test_answers_refuse_a_log_for_other_sentences():
    others = [Sentence(f"Another sentence {n} .", 1, 1) for n in range(6)]
    with pytest.raises(SystemExit):
        zero_shot.answers([entry(0, [0], answered("B1"), sentences=others)], SENTENCES, PROMPT_DIGEST)


def test_send_pass_logs_every_call_and_stops_at_a_failure_every_call_would_repeat(tmp_path, monkeypatch):
    log = tmp_path / "dev.jsonl"
    monkeypatch.setattr(zero_shot, "log_path", lambda split: log)
    monkeypatch.setattr(zero_shot, "ML_ROOT", tmp_path)

    def attempt(split, batch, indices, sentences, system_prompt, prompt_digest):
        call = failed("authentication_failed") if batch == 2 else answered(*["B1"] * len(indices))
        return zero_shot.record(split, batch, indices, sentences, prompt_digest, "now", call) | {
            "plan_window_used": 0.5
        }

    monkeypatch.setattr(zero_shot, "attempt", attempt)
    pending = {0: [0, 1], 1: [2, 3], 2: [4, 5]}
    with pytest.raises(claude_code.RunStopped, match="authentication_failed"):
        zero_shot.send_pass("dev", SENTENCES, pending, "Rate them.", PROMPT_DIGEST, workers=1)
    records = zero_shot.read_log(log)
    assert [r["batch"] for r in records] == [0, 1, 2]
    assert not any("plan_window_used" in r for r in records)
    assert zero_shot.answers(records, SENTENCES, PROMPT_DIGEST) == {0: 3, 1: 3, 2: 3, 3: 3}


def test_send_pass_returns_how_many_calls_failed(tmp_path, monkeypatch):
    monkeypatch.setattr(zero_shot, "log_path", lambda split: tmp_path / "dev.jsonl")

    def attempt(split, batch, indices, sentences, system_prompt, prompt_digest):
        call = answered(*["B1"] * len(indices)) if batch % 2 else failed()
        return zero_shot.record(split, batch, indices, sentences, prompt_digest, "now", call)

    monkeypatch.setattr(zero_shot, "attempt", attempt)
    pending = {0: [0], 1: [1], 2: [2], 3: [3]}
    assert zero_shot.send_pass("dev", SENTENCES, pending, "Rate them.", PROMPT_DIGEST, workers=2) == 2


def test_send_retries_only_the_unanswered_batches(tmp_path, monkeypatch):
    log = tmp_path / "dev.jsonl"
    monkeypatch.setattr(zero_shot, "log_path", lambda split: log)
    monkeypatch.setattr(zero_shot, "BATCH_SIZE", 2)
    monkeypatch.setattr(zero_shot.claude_code, "check_not_nested", lambda: None)
    monkeypatch.setattr(zero_shot.claude_code, "executable", lambda: "/bin/claude")
    sent = []

    def attempt(split, batch, indices, sentences, system_prompt, prompt_digest):
        sent.append(batch)
        call = failed() if batch == 1 and sent.count(1) == 1 else answered(*["B2"] * len(indices))
        return zero_shot.record(split, batch, indices, sentences, prompt_digest, "now", call)

    monkeypatch.setattr(zero_shot, "attempt", attempt)
    zero_shot.send("dev", SENTENCES, limit=None, workers=1)
    assert sorted(sent) == [0, 1, 1, 2]
    _, prompt_digest = zero_shot.prompt()
    assert len(zero_shot.answers(zero_shot.read_log(log), SENTENCES, prompt_digest)) == 6
    zero_shot.send("dev", SENTENCES, limit=None, workers=1)
    assert len(sent) == 4


def test_accounting_counts_tokens_cost_and_failures():
    records = [entry(0, [0], answered("B1")), entry(1, [1], answered("B1")), entry(2, [2], failed())]
    use = zero_shot.accounting(records)
    assert use["calls"] == 3
    assert use["failed_calls"] == 1
    assert use["errors"] == {"timeout": 1}
    assert use["tokens_by_model"] == {
        "claude-opus-5-5": {
            "inputTokens": 20,
            "cacheCreationInputTokens": 0,
            "cacheReadInputTokens": 0,
            "outputTokens": 100,
            "thinkingTokens": 0,
            "costUSD": pytest.approx(0.02),
        }
    }
    assert use["cost_usd"] == pytest.approx(0.02)
    assert use["seconds_per_call"]["median"] == 4.5
    assert use["served_models"] == ["claude-opus-5-5"]


def test_the_prompt_is_the_versioned_file():
    text, prompt_digest = zero_shot.prompt()
    assert zero_shot.PROMPT_PATH.name == f"cefr-zero-shot-{zero_shot.PROMPT_VERSION}.txt"
    assert prompt_digest == zero_shot.digest(text)
    assert "readily understand" in text
    assert "on its own" in text
