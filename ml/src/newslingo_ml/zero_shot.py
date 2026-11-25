"""Compares the CEFR classifier with a zero-shot LLM: Claude, through Claude
Code headless on the user's plan, rating CEFR-SP sentences.

    python -I -m newslingo_ml.zero_shot --split dev --batches 2
    python -I -m newslingo_ml.zero_shot --split test
    python -I -m newslingo_ml.zero_shot --split test --score-only

Sentences go in an order fixed by the seed, in batches of BATCH_SIZE
unrelated sentences, detokenized and numbered, with the system prompt in
ml/prompts/ and a JSON schema that allows one CEFR level for each
(newslingo_ml.claude_code). The prompt asks for each sentence to be rated on
its own, and shows no labelled example. A batch, rather than one sentence a
call, keeps a whole split within the limits of the user's Pro plan.

Every call, failed or not, is appended to
ml/reports/zero-shot-<split>-<run>.jsonl with its usage, notional cost and
latency, and its sentences by number and text digest, never the text. A rerun
sends only the batches still unanswered, so a run stopped by the plan's
limits continues where it stopped.

On the validation split it prints the model's scores and stops; --batches
takes the first batches in the seeded order, as a seeded sample. The test
split is sent whole, with the prompt and settings fixed beforehand; once
every test sentence has an answer, the answers are scored beside the chosen
classifier, the light model and the two baselines on the same sentences,
and the script writes ml/reports/<date>-zero-shot.md and .json.
--score-only scores the recorded answers without sending anything.

Run it from your own terminal: Claude Code refuses to start inside a Claude
Code session.
"""

import argparse
import datetime
import hashlib
import json
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np

from newslingo_ml import claude_code, corpus
from newslingo_ml.corpus import LEVEL_NAMES, LEVELS, ML_ROOT, Sentence
from newslingo_ml.metrics import annotator_agreement, bootstrap_interval, confusion, level_f1, scores
from newslingo_ml.sentence_eval import SEED, percent, provenance
from newslingo_ml.text import detokenize

# The protocol. A change to any of these is a new run with a log of its own;
# a new prompt also needs a new PROMPT_VERSION.
MODEL = "claude-opus-5-5"
EFFORT = "high"
BATCH_SIZE = 20
PROMPT_VERSION = "v1"
PROMPT_PATH = ML_ROOT / "prompts" / f"cefr-zero-shot-{PROMPT_VERSION}.txt"
SCHEMA = {
    "type": "object",
    "properties": {
        "levels": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "level": {"type": "string", "enum": [LEVEL_NAMES[level] for level in LEVELS]},
                },
                "required": ["id", "level"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["levels"],
    "additionalProperties": False,
}
RUN = f"{MODEL}-{EFFORT}-prompt-{PROMPT_VERSION}-batch-{BATCH_SIZE}"
LLM_NAME = f"Zero-shot LLM: {MODEL}, {EFFORT} effort, prompt {PROMPT_VERSION}"
TIMEOUT_SECONDS = 600
PASSES = 3

# The classifier chosen on 2026-11-19, and the report that scored it on the test split.
CLASSIFIER = "reports/2026-11-19-ensemble-dev-all-four.json"
CLASSIFIER_REPORT = "reports/2026-11-19-transformer.json"

LEVEL_OF = {name: level for level, name in LEVEL_NAMES.items()}
TOKEN_FIELDS = ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")
MODEL_USAGE_FIELDS = (
    "inputTokens",
    "cacheCreationInputTokens",
    "cacheReadInputTokens",
    "outputTokens",
    "thinkingTokens",
    "costUSD",
)
INTERVAL_METRICS = ("either", "macro_f1_paper", "exact", "adjacent")


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def prompt() -> tuple[str, str]:
    """The system prompt and its SHA-256 digest."""
    text = PROMPT_PATH.read_text(encoding="utf-8")
    return text, digest(text)


def log_path(split: str) -> Path:
    return ML_ROOT / "reports" / f"zero-shot-{split}-{RUN}.jsonl"


def relative(path: Path) -> str:
    return str(path.relative_to(ML_ROOT))


def batches(count: int) -> list[list[int]]:
    """Sentence numbers in the seeded order, cut into batches."""
    order = [int(index) for index in np.random.default_rng(SEED).permutation(count)]
    return [order[start : start + BATCH_SIZE] for start in range(0, count, BATCH_SIZE)]


def message(sentences: list[Sentence]) -> str:
    return "\n".join(
        f'<sentence id="{number}">{detokenize(sentence.text)}</sentence>'
        for number, sentence in enumerate(sentences, 1)
    )


def read_levels(output: dict | None, count: int) -> list[str] | None:
    """The levels of a batch's sentences in their order, or None unless the
    answer gives exactly one of the six levels for each id from 1 to count."""
    if not isinstance(output, dict) or set(output) != {"levels"} or not isinstance(output["levels"], list):
        return None
    found = {}
    for item in output["levels"]:
        if not isinstance(item, dict) or set(item) != {"id", "level"} or item["level"] not in LEVEL_OF:
            return None
        if item["id"] in found:
            return None
        found[item["id"]] = item["level"]
    if set(found) != set(range(1, count + 1)):
        return None
    return [found[number] for number in range(1, count + 1)]


def now() -> str:
    return datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds")


def record(
    split: str,
    batch: int,
    indices: list[int],
    sentences: list[Sentence],
    prompt_digest: str,
    started: str,
    call: claude_code.Call,
) -> dict:
    """One call as the log keeps it: its sentences by number and digest, the
    settings, the levels or the error, and what the call used."""
    error = call.error
    levels = read_levels(call.output, len(indices)) if error is None else None
    if error is None and levels is None:
        error = "invalid_output"
    entry = {
        "split": split,
        "batch": batch,
        "indices": indices,
        "text_sha256": [digest(sentences[index].text)[:16] for index in indices],
        "run": RUN,
        "model": MODEL,
        "effort": EFFORT,
        "prompt_version": PROMPT_VERSION,
        "prompt_sha256": prompt_digest,
        "started": started,
        "levels": levels,
        "error": error,
        "served_model": call.model,
        "claude_code_version": call.claude_code_version,
        "usage": {name: call.usage.get(name) for name in TOKEN_FIELDS},
        "model_usage": {
            name: {key: values.get(key) for key in MODEL_USAGE_FIELDS}
            for name, values in call.model_usage.items()
        },
        "cost_usd": call.cost_usd,
        "duration_ms": call.duration_ms,
        "duration_api_ms": call.duration_api_ms,
        "num_turns": call.num_turns,
        "wall_seconds": call.wall_seconds,
    }
    if error:
        entry["detail"] = call.detail
        entry["output"] = call.output
    return entry


def read_log(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def answers(records: list[dict], sentences: list[Sentence], prompt_digest: str) -> dict[int, int]:
    """Each answered sentence's level, from the first call that answered it.
    Refuses a log written for other sentences or with another prompt."""
    found: dict[int, int] = {}
    for entry in records:
        if entry["prompt_sha256"] != prompt_digest:
            raise SystemExit(
                f"Batch {entry['batch']} was sent with another prompt than {PROMPT_PATH.name}: "
                "a changed prompt needs a new PROMPT_VERSION."
            )
        for index, text_digest in zip(entry["indices"], entry["text_sha256"], strict=True):
            if text_digest != digest(sentences[index].text)[:16]:
                raise SystemExit(
                    f"Sentence {index} of the log is not sentence {index} of the {entry['split']} split."
                )
        if entry["levels"] is None:
            continue
        for index, level in zip(entry["indices"], entry["levels"], strict=True):
            found.setdefault(index, LEVEL_OF[level])
    return found


def attempt(
    split: str, batch: int, indices: list[int], sentences: list[Sentence], system_prompt: str, prompt_digest: str
) -> dict:
    started = now()
    call = claude_code.run(
        system_prompt, message([sentences[i] for i in indices]), SCHEMA, MODEL, EFFORT, TIMEOUT_SECONDS
    )
    entry = record(split, batch, indices, sentences, prompt_digest, started, call)
    entry["plan_window_used"] = call.plan_window_used  # Printed while running, never logged.
    return entry


def send_pass(
    split: str,
    sentences: list[Sentence],
    pending: dict[int, list[int]],
    system_prompt: str,
    prompt_digest: str,
    workers: int,
) -> int:
    """Sends each pending batch once, logging every call as it ends, and
    returns how many failed. Stops at the first failure that every later call
    would repeat."""
    failed, stopped = 0, None
    with log_path(split).open("a", encoding="utf-8") as log, ThreadPoolExecutor(workers) as pool:
        futures = [
            pool.submit(attempt, split, batch, indices, sentences, system_prompt, prompt_digest)
            for batch, indices in pending.items()
        ]
        for done, future in enumerate(as_completed(futures), 1):
            if future.cancelled():
                continue
            entry = future.result()
            window = entry.pop("plan_window_used", None)
            log.write(json.dumps(entry, ensure_ascii=False) + "\n")
            log.flush()
            if entry["error"]:
                failed += 1
                print(f"  batch {entry['batch']}: {entry['error']}: {entry.get('detail')}")
                if entry["error"] in claude_code.STOPPING_ERRORS and stopped is None:
                    stopped = entry
                    for other in futures:
                        other.cancel()
            print(
                f"  {done} of {len(pending)} batches sent, {failed} failed"
                + (f"; {100 * window:.0f}% of the plan's five-hour window used" if window is not None else "")
            )
    if stopped:
        raise claude_code.RunStopped(
            f"Stopped at batch {stopped['batch']}: {stopped['error']}: {stopped.get('detail')}\n"
            f"Every answer so far is kept in {relative(log_path(split))}. Rerun the command to continue."
        )
    return failed


def send(split: str, sentences: list[Sentence], limit: int | None, workers: int) -> None:
    claude_code.check_not_nested()
    claude_code.executable()
    system_prompt, prompt_digest = prompt()
    chosen = dict(enumerate(batches(len(sentences))[:limit]))
    for number in range(1, PASSES + 1):
        answered = answers(read_log(log_path(split)), sentences, prompt_digest)
        pending = {batch: indices for batch, indices in chosen.items() if any(i not in answered for i in indices)}
        if not pending:
            break
        print(f"Pass {number}: sending {len(pending)} {split} batches to {MODEL}, {workers} at a time.")
        if send_pass(split, sentences, pending, system_prompt, prompt_digest, workers) == len(pending):
            break
    answered = answers(read_log(log_path(split)), sentences, prompt_digest)
    wanted = [index for indices in chosen.values() for index in indices]
    print(f"{sum(1 for index in wanted if index in answered)} of {len(wanted)} {split} sentences answered.")


def accounting(records: list[dict]) -> dict:
    """What the calls used: tokens, notional cost at API prices (the plan
    bills none of it), and time per answered call."""
    answered = [entry for entry in records if entry["error"] is None]

    def spread(values: list[float]) -> dict[str, float | None]:
        if not values:
            return {"median": None, "p90": None}
        return {"median": float(np.median(values)), "p90": float(np.percentile(values, 90))}

    return {
        "calls": len(records),
        "failed_calls": len(records) - len(answered),
        "errors": dict(Counter(entry["error"] for entry in records if entry["error"])),
        # By model: Claude Code makes small calls of its own beside the rating.
        "tokens_by_model": {
            model: {
                name: sum((entry["model_usage"].get(model) or {}).get(name) or 0 for entry in records)
                for name in MODEL_USAGE_FIELDS
            }
            for model in sorted({model for entry in records for model in entry["model_usage"]})
        },
        "cost_usd": float(sum(entry["cost_usd"] or 0 for entry in records)),
        "served_models": sorted({name for entry in records for name in entry["model_usage"]}),
        "claude_code_versions": sorted(
            {entry["claude_code_version"] for entry in records if entry["claude_code_version"]}
        ),
        "seconds_per_call": spread([entry["wall_seconds"] for entry in answered]),
        "api_seconds_per_call": spread(
            [entry["duration_api_ms"] / 1000 for entry in answered if entry["duration_api_ms"] is not None]
        ),
        "first_call": min((entry["started"] for entry in records), default=None),
        "last_call": max((entry["started"] for entry in records), default=None),
    }


def summary(split: str, sentences: list[Sentence], prompt_digest: str) -> dict:
    """The model's scores on the sentences of one split it has answered."""
    records = read_log(log_path(split))
    answered = answers(records, sentences, prompt_digest)
    indices = sorted(answered)
    subset = [sentences[index] for index in indices]
    predicted = np.array([answered[index] for index in indices])
    return {
        "log": relative(log_path(split)),
        "sentences": len(indices),
        "scores": scores(predicted, subset) if indices else None,
        "human": annotator_agreement(subset) if indices else None,
        "predicted_counts": {str(level): int(np.sum(predicted == level)) for level in LEVELS},
        "level_counts": {str(level): sum(1 for s in subset if s.high == level) for level in LEVELS},
        "accounting": accounting(records),
    }


def compare(date: str) -> dict:
    """Scores the zero-shot answers on the whole test split beside the
    classifier, the light model and the baselines."""
    # Torch loads only here: the calls and the pilot do not need it.
    import torch

    from newslingo_ml.transformer_eval import References, load_model, paired_difference, predict

    _, prompt_digest = prompt()
    test = corpus.load("test")
    records = read_log(log_path("test"))
    answered = answers(records, test, prompt_digest)
    missing = len(test) - len(answered)
    if missing:
        raise SystemExit(f"{missing} test sentences have no answer yet: rerun without --score-only to send them.")

    references = References.fit()
    classifier = load_model(CLASSIFIER)
    classifier_name = f"Classifier: {classifier['name']}"
    predictions = references.predict(test)
    predictions[classifier_name] = predict(classifier, [detokenize(s.text) for s in test])
    llm = np.array([answered[index] for index in range(len(test))])
    predictions[LLM_NAME] = llm

    # The same models scored on the same sentences on 2026-11-19.
    reported = json.loads((ML_ROOT / CLASSIFIER_REPORT).read_text())["test"]
    earlier_names = {name: name for name in predictions if name in reported}
    earlier_names[classifier_name] = f"Chosen: {classifier['name']}"
    matches_reported = {
        name: reported[earlier]["scores"] == scores(predictions[name], test)
        for name, earlier in earlier_names.items()
    }

    def difference(first: str, second: str, metric: str) -> tuple[float, float, float]:
        return paired_difference(predictions[first], predictions[second], test, metric, SEED)

    return {
        "date": date,
        "data_revision": corpus.load_manifest()["revision"],
        "provenance": provenance(),
        "torch": torch.__version__,
        "llm": {
            "name": LLM_NAME,
            "run": RUN,
            "model": MODEL,
            "effort": EFFORT,
            "batch_size": BATCH_SIZE,
            "prompt": {"path": relative(PROMPT_PATH), "version": PROMPT_VERSION, "sha256": prompt_digest},
            "schema": SCHEMA,
            "timeout_seconds": TIMEOUT_SECONDS,
        },
        "pilot": summary("dev", corpus.load("dev"), prompt_digest) if log_path("dev").exists() else None,
        "classifier": {
            "name": classifier["name"],
            "report": CLASSIFIER,
            "decision": classifier["decision"],
            "scored_in": CLASSIFIER_REPORT,
        },
        "matches_reported": matches_reported,
        "light_model": references.light.name,
        "human": annotator_agreement(test),
        "test": {
            name: {
                "scores": scores(predicted, test),
                "intervals": {m: bootstrap_interval(predicted, test, m, SEED) for m in INTERVAL_METRICS},
            }
            for name, predicted in predictions.items()
        },
        "differences": {
            "Either-annotator accuracy, classifier minus zero-shot LLM": difference(
                classifier_name, LLM_NAME, "either"
            ),
            "Paper's macro-F1, classifier minus zero-shot LLM": difference(
                classifier_name, LLM_NAME, "macro_f1_paper"
            ),
            "QWK, classifier minus zero-shot LLM": difference(classifier_name, LLM_NAME, "qwk"),
            "Either-annotator accuracy, zero-shot LLM minus light model": difference(
                LLM_NAME, references.light_name, "either"
            ),
            "Either-annotator accuracy, zero-shot LLM minus readability baseline": difference(
                LLM_NAME, "Readability (Flesch–Kincaid)", "either"
            ),
        },
        "level_f1": {
            name: {str(level): value for level, value in level_f1(predictions[name], test).items()}
            for name in (classifier_name, LLM_NAME)
        },
        "level_counts": {str(level): sum(1 for s in test if s.high == level) for level in LEVELS},
        "predicted_counts": {
            name: {str(level): int(np.sum(predictions[name] == level)) for level in LEVELS}
            for name in (classifier_name, LLM_NAME)
        },
        "confusion_llm": confusion(llm, test),
        "log": relative(log_path("test")),
        "accounting": accounting(records),
    }


def cell(entry: dict, metric: str) -> str:
    low, high = entry["intervals"][metric]
    return f"{percent(entry['scores'][metric])} ({percent(low)}–{percent(high)})"


def seconds(value: float | None) -> str:
    return "—" if value is None else f"{value:.1f} s"


def level_table(rows: dict[str, list[str]], last: str | None = None) -> list[str]:
    header = "| Model | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + (f" | {last} |" if last else " |")
    lines = [header, "|---|" + "---|" * (len(LEVELS) + (1 if last else 0))]
    lines += [f"| {name} | " + " | ".join(cells) + " |" for name, cells in rows.items()]
    return lines


def report(result: dict) -> str:
    llm, use = result["llm"], result["accounting"]
    sentences = sum(result["level_counts"].values())
    lines = [
        f"# CEFR sentence classifier against a zero-shot LLM, {result['date']}",
        "",
        "Written by `python -I -m newslingo_ml.zero_shot`. Do not edit by hand; rerun it.",
        "",
        "## Setup",
        "",
        f"- Data: CEFR-SP, Wiki-Auto subset, revision `{result['data_revision']}`, CC BY-SA 3.0, all {sentences} "
        "sentences of the test split. Card: `ml/datasets/cefr-sp.md`. Gold level and metrics as in the earlier "
        "reports; the paper's macro-F1 is the metric of Arase et al. (2022).",
        f"- Zero-shot LLM: `{llm['model']}` at {llm['effort']} effort, through Claude Code headless (`claude -p`, "
        f"version {', '.join(use['claude_code_versions'])}) on the user's Claude plan. Models that served the "
        f"calls: {', '.join(f'`{m}`' for m in use['served_models'])}.",
        f"- The sentences went in an order fixed by the seed, in batches of {llm['batch_size']}, detokenized and "
        f"numbered, with the system prompt `ml/{llm['prompt']['path']}` (version {llm['prompt']['version']}, "
        f"SHA-256 `{llm['prompt']['sha256'][:16]}…`) and a JSON schema that allows one of the six levels for "
        "each. "
        "The prompt gives the CEFR-SP annotators' definition (a sentence's level is the lowest at which a learner "
        "readily understands it), short descriptions of the levels and the annotators' rule not to judge by the "
        "words alone, and asks for each sentence to be rated on its own. It shows no labelled example, where the "
        "annotators' guidelines had some. Claude Code ran with no tools, settings, MCP servers or skills, from "
        "an empty folder. Batches keep the whole split within the limits of the user's Pro plan.",
        "- The prompt and settings were fixed before the test split was sent"
        + (f", after a pilot on {result['pilot']['sentences']} validation sentences." if result["pilot"] else ".")
        + " The model cannot be made deterministic through Claude Code, so a rerun of the calls can give other "
        f"answers; this report is reproducible from the answers recorded in `ml/{result['log']}`.",
        f"- Classifier: {result['classifier']['name']}, read as its {result['classifier']['decision']} level, "
        f"from `{result['classifier']['report']}`, chosen on the validation split on 2026-11-19.",
        f"- The light model is the one `newslingo_ml.sentence_eval` chooses: {result['light_model']}.",
    ]
    differing = [name for name, same in result["matches_reported"].items() if not same]
    if differing:
        lines.append(
            f"- These scores differ from those in `{result['classifier']['scored_in']}` for: "
            f"{', '.join(differing)}. Inference on Apple's MPS is not bit-for-bit deterministic."
        )
    else:
        lines.append(
            "- The classifier, the light model and the baselines score exactly as they did in "
            f"`{result['classifier']['scored_in']}` on the same test sentences."
        )
    lines += [
        "- CEFR-SP has been public since 2022, so the LLM may have seen its labels in training, which would "
        "favour it.",
        f"- This report's code is at `{result['provenance']['commit']}`"
        + (" with uncommitted changes in `ml/`" if result["provenance"]["uncommitted_changes_in_ml"] else "")
        + ". Intervals are 95% bootstrap intervals over test sentences (1,000 resamples).",
        "",
        "## Human reference",
        "",
        f"On the test split the two annotators give the same level for {percent(result['human']['exact'])} of "
        f"sentences and are within one level for {percent(result['human']['adjacent'])}; their QWK is "
        f"{result['human']['qwk']:.3f}.",
        "",
        "## Test split",
        "",
        "| Model | Either annotator | Paper's macro-F1 | Exact | Within one level | MAE | Macro-F1, higher level "
        "| QWK |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for name, entry in result["test"].items():
        values = entry["scores"]
        lines.append(
            f"| {name} | {cell(entry, 'either')} | {cell(entry, 'macro_f1_paper')} | {cell(entry, 'exact')} "
            f"| {cell(entry, 'adjacent')} | {values['mae']:.2f} | {values['macro_f1']:.3f} | {values['qwk']:.3f} |"
        )
    lines.append("")
    for label, values in result["differences"].items():
        if label.startswith("QWK"):
            difference, low, high = (f"{value:+.3f}" for value in values)
        else:
            difference, low, high = (f"{100 * value:+.1f}" for value in values)
            difference += " points"
        lines.append(f"- {label}: {difference} (paired 95% interval {low} to {high}).")
    f1_rows = {
        name: [percent(values[str(level)]) for level in LEVELS]
        + [percent(result["test"][name]["scores"]["macro_f1_paper"])]
        for name, values in result["level_f1"].items()
    }
    count_rows = {
        "Test sentences at each level (higher level)": [str(result["level_counts"][str(n)]) for n in LEVELS]
    }
    count_rows |= {
        name: [str(counts[str(level)]) for level in LEVELS] for name, counts in result["predicted_counts"].items()
    }
    lines += [
        "",
        "### F1 for each level, the paper's way",
        "",
        *level_table(f1_rows, "Macro"),
        "",
        "### How often each level is given",
        "",
        *level_table(count_rows),
        "",
        "### Confusion matrix of the zero-shot LLM on the test split",
        "",
        "Rows are gold (higher) levels, columns predicted levels.",
        "",
        "| Gold | " + " | ".join(LEVEL_NAMES[level] for level in LEVELS) + " |",
        "|---|" + "---|" * len(LEVELS),
    ]
    for level, row in zip(LEVELS, result["confusion_llm"], strict=True):
        lines.append(f"| {LEVEL_NAMES[level]} | " + " | ".join(str(n) for n in row) + " |")
    errors = ", ".join(f"{n} × {error}" for error, n in use["errors"].items())
    lines += [
        "",
        "## Usage, cost and latency",
        "",
        f"- Calls for the test split: {use['calls']} for {sentences} sentences ({use['failed_calls']} failed"
        + (f": {errors}" if errors else "")
        + f"), from {use['first_call']} to {use['last_call']}.",
        *(
            f"- Tokens on `{model}`: {t['inputTokens']:,} input, {t['cacheCreationInputTokens']:,} written to the "
            f"cache, {t['cacheReadInputTokens']:,} read from it, and {t['outputTokens']:,} output, of which "
            f"{t['thinkingTokens']:,} thinking; notional cost ${t['costUSD']:.2f}."
            for model, t in use["tokens_by_model"].items()
        ),
        f"- Notional cost at API prices, as Claude Code computes it: ${use['cost_usd']:.2f}, "
        f"${use['cost_usd'] / sentences:.4f} a sentence. The calls ran on the user's plan, which bills none of "
        "it.",
        f"- Time per answered call of {llm['batch_size']} sentences: median "
        f"{seconds(use['seconds_per_call']['median'])}, 90th percentile "
        f"{seconds(use['seconds_per_call']['p90'])}, of which the API took a median of "
        f"{seconds(use['api_seconds_per_call']['median'])}. The classifier needs no call.",
    ]
    if result["pilot"]:
        pilot = result["pilot"]
        lines += [
            "",
            "## Validation pilot",
            "",
            f"Before the test split, the same prompt and settings rated {pilot['sentences']} validation "
            f"sentences, the first batches in the seeded order (`ml/{pilot['log']}`). The LLM matched an "
            f"annotator on {percent(pilot['scores']['either'])} of them, exactly on "
            f"{percent(pilot['scores']['exact'])}, with a QWK of {pilot['scores']['qwk']:.3f}. Nothing was tuned "
            "on the test split.",
        ]
    lines += [
        "",
        "## Not yet measured",
        "",
        "- Article-level accuracy on texts the user labels (milestone C).",
        "",
    ]
    return "\n".join(lines)


def print_summary(split: str, result: dict) -> None:
    values = result["scores"]
    if values is None:
        print(f"No {split} sentence has an answer yet.")
        return
    print(
        f"{result['sentences']} {split} sentences: either annotator {percent(values['either'])}, exact "
        f"{percent(values['exact'])}, within one level {percent(values['adjacent'])}, paper's macro-F1 "
        f"{percent(values['macro_f1_paper'])}, QWK {values['qwk']:.3f}."
    )
    for label, key in (("Gold levels", "level_counts"), ("Predicted levels", "predicted_counts")):
        print(f"{label}: " + ", ".join(f"{LEVEL_NAMES[level]} {result[key][str(level)]}" for level in LEVELS))
    use = result["accounting"]
    print(
        f"{use['calls']} calls, {use['failed_calls']} failed; tokens {use['tokens_by_model']}; notional cost "
        f"${use['cost_usd']:.2f}; median {seconds(use['seconds_per_call']['median'])} a call."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--split", choices=("dev", "test"), required=True)
    parser.add_argument("--batches", type=int, help="send only the first BATCHES batches in the seeded order")
    parser.add_argument("--workers", type=int, default=4, help="calls at a time (default 4)")
    parser.add_argument("--score-only", action="store_true", help="score the recorded answers and send nothing")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()
    if args.split == "test" and args.batches is not None:
        parser.error("the test split is sent whole: --batches is for the validation split")

    sentences = corpus.load(args.split)
    if not args.score_only:
        try:
            send(args.split, sentences, args.batches, args.workers)
        except claude_code.RunStopped as stopped:
            raise SystemExit(str(stopped)) from None
    if args.split == "dev":
        print_summary("dev", summary("dev", sentences, prompt()[1]))
        print("The test split was not read.")
        return
    result = compare(args.date)
    reports = ML_ROOT / "reports"
    (reports / f"{args.date}-zero-shot.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    (reports / f"{args.date}-zero-shot.md").write_text(report(result))
    print(report(result))


if __name__ == "__main__":
    main()
