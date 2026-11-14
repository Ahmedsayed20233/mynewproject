# Flosy v3.10.0 — CORU Information Extraction real-data training

Source: https://huggingface.co/datasets/abdoelsayed/CORU/tree/main/IE
Task: Character-trigram Multinomial Naive Bayes classifier of ITEM NAMES, plus a lexicon of real CORU items.
**Does not train OCR text detection/recognition and cannot guarantee every Egyptian receipt.**
Training split is CORU train only; val and test are not used for fitting.
The same product name may occur across splits; hence accuracy is separately shown for previously unseen normalized names.
Predictions are not calibrated probabilities and never authorize ledger writes.

| Split | Eligible | Overall accuracy | Previously unseen names | Unseen accuracy |
|---|---:|---:|---:|---:|
| Validation | 1486 | 0.8075 | 1299 | 0.7937 |
| Test | 1492 | 0.8338 | 1300 | 0.8277 |

Train rows used: 6947; valid classes: 21; trigram features: 1200; lexicon entries: 2600

Dataset SHA-256:

- train: e48ba80ff9cac0e024bf61fde9ff24ecf8b1e2fe3836065839df880af79c3bb9
- val: f2e118e5830f46984394a37dc1d75e5d3c9fc441aac2189f1c00a7039d1b32fb
- test: 792513e8d20a00cb4b89c56550ff1cdae5ac1596200f4567f87d82f5b31a81b8

License: CORU metadata currently marks MIT; preserve attribution, verify image rights separately.
Do not compare these item-category metrics with OCR CER/WER. They are different tasks.
This model is a low-risk suggestion aid for OCR field correction; owner must approve receipts.
