# ADR-002: Machine-learning code lives in `ml/`

- Status: Accepted
- Date: 2026-09-25
- Owners: Newslingo engineering

## Context

The ML roadmap adds work that the TypeScript application cannot host well: training and evaluating a CEFR difficulty classifier, and comparing language models on an evaluation set. That work needs Python, pinned datasets and committed reports. The classifier's first job is to check finished articles in the M7 generation pipeline, which runs server-side in Node.

The scope matrix defers a dedicated backend service, so a Python service in production would be a scope change.

The options were:

1. A separate repository for ML work.
2. A Python microservice that the application calls.
3. An `ml/` folder in this repository, with the application running exported models from Node.

## Decision

Use option 3. Machine-learning code lives in `ml/` in this repository:

- `ml/` is a self-contained Python project with its own pinned dependencies and a `.venv` that git ignores.
- Datasets are downloaded by committed scripts, pinned to an exact source revision and checked against recorded SHA-256 digests. Raw data stays out of git.
- Every dataset has a card recording its source, licence, version and splits before it is used.
- Evaluation reports are committed together with the model, prompt, schema and data versions, the date, and the seed that produced them.
- Nothing in `ml/` runs in pull-request CI. Training and evaluations are explicit local commands, or a separately triggered job.
- When the application needs a trained model, it runs an exported artifact from Node. The export format, ONNX or a small TypeScript port of a simple model, is chosen when the model is.

## Consequences

The evidence stays in the same repository as the product, which a portfolio reviewer needs. Production keeps a single Node deployment. Python becomes a second toolchain for contributors doing ML work, and exported models must stay in sync with the Node code that loads them.

## References

- `IMPLEMENTATION_PLAN.md` §5 (scope matrix) and §19 (decision log)
- CEFR-SP corpus: <https://github.com/yukiar/CEFR-SP>
