# Flosy AraReceipt training verification

Real manually reviewed Arabic receipts: 100 images, 4,609 annotations, MIT.
Task: OCR-text total-value region ranker; this is NOT an image-to-text OCR model.
Receipt-level train/test split: 80/20, no receipt leaks across split.

| Split | Regions | Positive | Precision | Recall | F1 | Top-1 receipt recall |
|---|---:|---:|---:|---:|---:|---:|
| Train | 1237 | 117 | 0.5095 | 0.9145 | 0.6544 | 0.92 |
| Held out | 329 | 33 | 0.4603 | 0.8788 | 0.6042 | 0.8947 |

Source: https://huggingface.co/datasets/IslamMesabah/AraReceipt/resolve/main/metadata.jsonl
Dataset SHA256: ef655abb85b1683a2755bea23c5daed38b9a73a0e1624f529035d6bfa272f1bb

Do not extrapolate to images or all Egyptian receipts. Values are not calibrated confidence. Manual correction remains required.
