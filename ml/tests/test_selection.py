from newslingo_ml.transformer_eval import selection_problem


def entry(name: str, either: float, f1: float, qwk: float = 0.7, chosen: bool = False, previous: bool = False):
    return {
        "report": name,
        "scores": {"either": either, "macro_f1_paper": f1, "qwk": qwk},
        "chosen": chosen,
        "previous": previous,
    }


def test_the_best_candidate_may_go_on():
    validation = [
        entry("new", 0.88, 0.86, chosen=True),
        entry("old", 0.86, 0.86, previous=True),
        entry("x", 0.87, 0.9),
    ]
    assert selection_problem(validation, "either") is None
    assert selection_problem(validation, "either", not_below="macro_f1_paper") is None


def test_a_candidate_that_is_not_the_best_may_not():
    validation = [
        entry("new", 0.87, 0.86, chosen=True),
        entry("old", 0.86, 0.86, previous=True),
        entry("x", 0.88, 0.9),
    ]
    assert "x is" in selection_problem(validation, "either", not_below="macro_f1_paper")


def test_a_switch_may_not_trade_the_rare_levels_for_accuracy():
    validation = [entry("new", 0.89, 0.85, chosen=True), entry("old", 0.86, 0.86, previous=True)]
    assert selection_problem(validation, "either") is None
    assert "lower macro_f1_paper" in selection_problem(validation, "either", not_below="macro_f1_paper")


def test_a_more_accurate_candidate_is_ignored_when_worse_at_the_rare_levels():
    validation = [
        entry("new", 0.87, 0.87, chosen=True),
        entry("old", 0.86, 0.86, previous=True),
        entry("x", 0.90, 0.80),
    ]
    assert selection_problem(validation, "either", not_below="macro_f1_paper") is None


def test_a_switch_must_be_more_accurate_than_the_previous_model():
    validation = [entry("new", 0.86, 0.90, qwk=0.9, chosen=True), entry("old", 0.86, 0.86, previous=True)]
    assert selection_problem(validation, "either") is None
    assert "does not beat old" in selection_problem(validation, "either", not_below="macro_f1_paper")


def test_not_below_needs_the_previous_model():
    assert "--previous" in selection_problem([entry("new", 0.9, 0.9, chosen=True)], "either", "macro_f1_paper")
