#!/usr/bin/env python3
"""Reproduce Flosy's compact synthetic Egyptian text NLU from the owner's ZIP.
This is a text *intent* classifier. It is NOT a speech recognizer and can NEVER
approve writing money to the ledger. No user data, network, secrets or APIs.
Usage: python tools/train_60k_voice_student.py /path/to/Flosy_Voice_AI_60K_Training_Complete.zip
      python tools/train_60k_voice_student.py /path/to/package.zip --write-assets .
Requires: numpy, scikit-learn; uses the uploaded 60k synthetic JSONL, not production DB.
"""
import argparse
import base64
import json
import zipfile
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

DATA = "Flosy_Voice_AI_Training_Package/"
EXPECTED = ["debt", "expense", "income", "none", "refund", "transfer"]


def read_jsonl(z, relative):
    return [json.loads(line) for line in z.read(DATA + relative).decode("utf8").splitlines() if line.strip()]


def fnv32(value):
    result = 2166136261
    for char in value:
        # Same checksum as JS charCodeAt for these BMP vocabulary characters.
        result = ((result ^ ord(char)) * 16777619) & 0xffffffff
    return f"{result:08x}"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("package", type=Path, help="original user-supplied 60k training ZIP")
    p.add_argument("--write-assets", type=Path, help="output directory; do not overwrite without review")
    args = p.parse_args()
    with zipfile.ZipFile(args.package) as z:
        rows = read_jsonl(z, "egyptian_finance_utterances.jsonl")
        hard = read_jsonl(z, "hard_cases.jsonl")
    assert len(rows) == 60000, "unexpected row count"
    assert len({r["text"] for r in rows}) == len(rows), "duplicate texts"
    assert all(r.get("synthetic") is True for r in rows), "not entirely synthetic"
    train = [r for r in rows if r["split"] == "train"]
    test = [r for r in rows if r["split"] == "test"]
    assert len(train) == 48000 and len(test) == 12000
    groups_tr = {r["template_group"] for r in train}
    groups_te = {r["template_group"] for r in test}
    assert groups_tr.isdisjoint(groups_te), "template leakage"

    vec = TfidfVectorizer(
        analyzer="word", ngram_range=(1, 2), min_df=10,
        max_features=800, sublinear_tf=True, norm="l2",
        strip_accents="unicode",
    )
    xx = vec.fit_transform([r["text"] for r in train])
    model = LogisticRegression(max_iter=130, C=2.0)
    model.fit(xx, [r["intent"] for r in train])
    assert model.classes_.tolist() == EXPECTED
    predicted = model.predict(vec.transform([r["text"] for r in test]))
    hard_pred = model.predict(vec.transform([r["text"] for r in hard]))
    test_y = [r["intent"] for r in test]
    hard_y = [r["intent"] for r in hard]

    terms = "|".join(vec.get_feature_names_out().tolist())
    idf = base64.b64encode(np.rint(vec.idf_ * 32).clip(0, 255).astype("uint8").tobytes()).decode()
    coef = model.coef_
    scales = np.max(np.abs(coef), axis=1) / 127
    weights = base64.b64encode(np.rint(coef / scales[:, None])
                              .clip(-127, 127).astype("int8").tobytes()).decode()
    report = {
        "type": "synthetic text intent model, never voice-to-text",
        "training": len(train), "held_out_test": len(test),
        "train_test_template_overlap": len(groups_tr.intersection(groups_te)),
        "vocabulary_features": 800,
        "held_out_accuracy_unquantized": accuracy_score(test_y, predicted),
        "held_out_macro_f1_unquantized": f1_score(test_y, predicted, average="macro"),
        "handwritten_hard_correct_unquantized": sum(x == y for x, y in zip(hard_y, hard_pred)),
        "hard_case_count": len(hard),
        "learned_terms_fnv32": fnv32(terms),
        "learned_weights_fnv32": fnv32(weights),
        "learned_idf_fnv32": fnv32(idf),
        "intercepts": np.round(model.intercept_, 6).tolist(),
        "scales": np.round(scales, 9).tolist(),
        "caveat": "Synthetic-only. Quantized browser predictions require independent Node regression. Always preview-only.",
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.write_assets:
        d = args.write_assets
        d.mkdir(parents=True, exist_ok=True)
        path_vocab = d / "flosy-nlu-compact-vocab.js"
        path_weights = d / "flosy-nlu-compact-weights.js"
        path_vocab.write_text("/* Trained synthetic vocabulary; no personal data. */\n"
                              "(function(w){w.FLOSY_NLU_COMPACT_VOCAB="
                              + json.dumps(terms, ensure_ascii=False) + ";})(window);\n", encoding="utf8")
        path_weights.write_text("/* Quantized TF-IDF logistic model weights; synthetic only. */\n"
                                "(function(w){w.FLOSY_NLU_COMPACT_WEIGHTS64="
                                + json.dumps(weights) + ";})(window);\n", encoding="utf8")
        (d / "flosy-nlu-compact-parameters.json").write_text(
            json.dumps({"bias": report["intercepts"], "scales": report["scales"],
                        "idfs64": idf}, ensure_ascii=False, indent=2), encoding="utf8")
        (d / "flosy-nlu-compact-metrics.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")


if __name__ == "__main__":
    main()
