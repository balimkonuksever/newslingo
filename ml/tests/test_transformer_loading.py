import pytest
import torch

from newslingo_ml import transformer


def fake_loader(dtype: torch.dtype, seen: dict):
    def from_pretrained(name, **options):
        seen.update(options, name=name)
        return torch.nn.Linear(2, 2).to(dtype)

    return from_pretrained


def test_models_load_in_float32(monkeypatch):
    seen = {}
    monkeypatch.setattr(
        transformer.AutoModelForSequenceClassification, "from_pretrained", fake_loader(torch.float32, seen)
    )
    model = transformer.load_pretrained("microsoft/deberta-v3-base", num_labels=6)
    assert seen == {"name": "microsoft/deberta-v3-base", "dtype": torch.float32, "num_labels": 6}
    assert next(model.parameters()).dtype == torch.float32


def test_a_model_that_is_not_float32_is_refused(monkeypatch):
    monkeypatch.setattr(
        transformer.AutoModelForSequenceClassification, "from_pretrained", fake_loader(torch.float16, {})
    )
    with pytest.raises(ValueError, match="not float32"):
        transformer.load_pretrained("microsoft/deberta-v3-base")
