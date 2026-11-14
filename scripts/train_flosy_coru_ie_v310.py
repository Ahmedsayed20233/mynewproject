#!/usr/bin/env python3
"""Reproducible CORU-IE-only training for Flosy v3.10.0.
Train a compact character n-gram Naive Bayes item classifier and real-item
fuzzy lexicon from CORU train CSV; evaluate CORU val/test CSV separately.
This DOES NOT train photo OCR. No receipt images or customer PII are copied.
"""
from __future__ import annotations
import collections
import csv
import hashlib
import io
import json
import math
import re
import time
import unicodedata
import urllib.request
from pathlib import Path

BASE = "https://huggingface.co/datasets/abdoelsayed/CORU/resolve/main/IE/"
OUT = Path("flosy-receipt-coru-model-v310.js")
REPORT = Path("docs/FLOSY_V310_CORU_IE_TRAINING_RESULTS.md")
MAX_BYTES = 5_000_000
VERSION = "3.10.0"

def fetch(split):
    url = BASE + split + ".csv"
    error = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Flosy-Research-Training/3.10.0",
                "Accept": "text/csv,text/plain,*/*"
            })
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("CSV exceeds safety limit")
            text = raw.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not reader.fieldnames or "Item_Name" not in reader.fieldnames or "class" not in reader.fieldnames:
                raise ValueError("CORU IE schema is missing Item_Name / class: " + str(reader.fieldnames))
            return rows, hashlib.sha256(raw).hexdigest(), reader.fieldnames
        except Exception as e:
            error = e
            if attempt < 2:
                time.sleep(1 + attempt)
    raise RuntimeError("Unable to retrieve CORU IE " + split + ": " + str(error))

def norm(text):
    s = unicodedata.normalize("NFKC", str(text or "")).lower().strip()
    s = s.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789"))
    s = re.sub("[إأآٱ]", "ا", s)
    s = s.replace("ى", "ي").replace("ة", "ه")
    s = re.sub(r"[\u064b-\u065f\u0640\u200c-\u200f\u202a-\u202e]", "", s)
    s = re.sub(r"[^0-9a-z\u0621-\u064a ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def safe_name(name):
    s = norm(name)
    return (3 <= len(s) <= 75 and bool(re.search("[a-z\u0621-\u064a]", s))
        and not bool(re.search(r"\b(?:otp|pin|cvv|password|phone|mobile)\b", s))
        and not bool(re.search(r"\b\d{8,}\b", s)))

def clean(rows):
    result = []
    for row in rows:
        name = norm(row.get("Item_Name"))
        label = norm(row.get("class"))
        if safe_name(name) and 1 < len(label) <= 55 and re.search("[a-z\u0621-\u064a]", label):
            result.append((name, label))
    return result

def grams(text):
    return collections.Counter((("_" + text.replace(" ", "_") + "_")[i:i + 3]
        for i in range(max(0, len(text) + 1))))

def train(rows):
    labels = collections.Counter(cls for _, cls in rows)
    kept = {label for label, count in labels.items() if count >= 12}
    if not kept:
        raise RuntimeError("No recurrent class labels to train; please inspect CORU schema")
    training = [(name, cls) for name, cls in rows if cls in kept]
    docs = collections.Counter()
    for name, _ in training:
        docs.update(grams(name).keys())
    vocabulary = [key for key, _ in docs.most_common(1200)]
    ids = {key: i for i, key in enumerate(vocabulary)}
    count = collections.Counter(cls for _, cls in training)
    token = {cls: collections.Counter() for cls in kept}
    total = collections.Counter()
    for name, cls in training:
        for gram, frequency in grams(name).items():
            if gram in ids:
                token[cls][gram] += frequency
                total[cls] += frequency
    classes = sorted(kept, key=lambda cls: (-count[cls], cls))
    table = []
    for cls in classes:
        denom = total[cls] + len(vocabulary)
        table.append([round(math.log((token[cls][g] + 1) / denom) * 100)
            for g in vocabulary])
    priors = [round(math.log(count[cls] / len(training)) * 100) for cls in classes]
    aliases = collections.Counter(training)
    lexicon = [[name, cls, n] for (name, cls), n in aliases.most_common(2600)]
    return {"classes": classes, "grams": vocabulary, "logWeights100": table,
        "logPriors100": priors, "lexicon": lexicon,
        "trainingRecords": len(training), "allClasses": len(labels),
        "keptClasses": len(classes)}

def predict(name, model):
    text_grams = grams(name)
    ids = {g: i for i, g in enumerate(model["grams"])}
    features = [(ids[g], n) for g, n in text_grams.items() if g in ids]
    if not features:
        return None
    scores = []
    for i, row in enumerate(model["logWeights100"]):
        score = model["logPriors100"][i]
        for j, n in features:
            score += row[j] * min(n, 3)
        scores.append(score)
    top = max(range(len(scores)), key=lambda i: scores[i])
    return model["classes"][top]

def evaluate(rows, model, train_names):
    eligible = [(n, c) for n, c in rows if c in model["classes"]]
    seen = [(n, c) for n, c in eligible if n in train_names]
    unseen = [(n, c) for n, c in eligible if n not in train_names]
    def calc(seq):
        correct = sum(predict(n, model) == label for n, label in seq)
        return {"count": len(seq), "correct": correct,
            "accuracy": round(correct / len(seq), 4) if seq else None}
    return {"all": calc(eligible), "seenName": calc(seen), "unseenName": calc(unseen),
        "unseenOrExcludedClasses": len(rows) - len(eligible)}

def main():
    datasets = {}
    files = {}
    schemas = {}
    for split in ("train", "val", "test"):
        raw, sha, fields = fetch(split)
        files[split] = sha
        schemas[split] = fields
        datasets[split] = clean(raw)
        print(f"CORU IE {split}: rows={len(raw)}, valid={len(datasets[split])}, sha256={sha}", flush=True)
    if len(datasets["train"]) < 200 or len(datasets["test"]) < 20:
        raise RuntimeError("CORU IE train/test appears unexpectedly small")
    model = train(datasets["train"])
    seen_names = set(name for name, _ in datasets["train"])
    val = evaluate(datasets["val"], model, seen_names)
    test = evaluate(datasets["test"], model, seen_names)
    model.update({"version": VERSION, "kind": "coru-ie-char-trigram-naive-bayes-and-lexicon",
        "source": "abdoelsayed/CORU IE/{train,val,test}.csv",
        "sourceURL": "https://huggingface.co/datasets/abdoelsayed/CORU",
        "license": "MIT (metadata and README at training time; recheck before commercial release)",
        "sha256BySplit": files, "val": val, "test": test,
        "scope": "OCR text postprocessing, NOT image OCR or guaranteed category confidence"})
    OUT.write_text("(function(root){root.FLOSY_CORU_IE_V310=" +
        json.dumps(model, ensure_ascii=False, separators=(",", ":")) +
        ";})(typeof window!=='undefined'?window:globalThis);\n", encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    lines = [
        "# Flosy v3.10.0 — CORU Information Extraction real-data training",
        "",
        "Source: https://huggingface.co/datasets/abdoelsayed/CORU/tree/main/IE",
        "Task: Character-trigram Multinomial Naive Bayes classifier of ITEM NAMES, plus a lexicon of real CORU items.",
        "**Does not train OCR text detection/recognition and cannot guarantee every Egyptian receipt.**",
        "Training split is CORU train only; val and test are not used for fitting.",
        "The same product name may occur across splits; hence accuracy is separately shown for previously unseen normalized names.",
        "Predictions are not calibrated probabilities and never authorize ledger writes.",
        "",
        "| Split | Eligible | Overall accuracy | Previously unseen names | Unseen accuracy |",
        "|---|---:|---:|---:|---:|",
    ]
    for label, metrics in (("Validation", val), ("Test", test)):
        lines.append(f'| {label} | {metrics["all"]["count"]} | {metrics["all"]["accuracy"]} | '
                     f'{metrics["unseenName"]["count"]} | {metrics["unseenName"]["accuracy"]} |')
    lines += ["", f"Train rows used: {model['trainingRecords']}; valid classes: {model['keptClasses']}; "
        f"trigram features: {len(model['grams'])}; lexicon entries: {len(model['lexicon'])}",
        "", "Dataset SHA-256:", ""]
    lines += [f"- {key}: {sha}" for key, sha in files.items()]
    lines += ["", "License: CORU metadata currently marks MIT; preserve attribution, verify image rights separately.",
      "Do not compare these item-category metrics with OCR CER/WER. They are different tasks.",
      "This model is a low-risk suggestion aid for OCR field correction; owner must approve receipts."]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"outModelBytes": OUT.stat().st_size, "trainingRecords": model["trainingRecords"],
       "classes": model["keptClasses"], "val": val, "test": test}, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
