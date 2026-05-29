from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path

import numpy as np
import xgboost as xgb


FEATURE_NAMES = ["weight_lbs", "typical_distance_miles", "actual_duration_hours"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate the LoadMind pricing model against a benchmark CSV.")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/pricing_validation.csv"),
        help="Validation CSV path, relative to Backend unless absolute.",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("xgboost_pricing_model.json"),
        help="XGBoost model artifact path, relative to Backend unless absolute.",
    )
    parser.add_argument("--exchange-rate", type=float, default=1.52, help="USD to AUD exchange rate used for reporting.")
    parser.add_argument(
        "--hide-rows",
        action="store_true",
        help="Hide per-scenario prediction details.",
    )
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[1]
    data_path = args.data if args.data.is_absolute() else backend_dir / args.data
    model_path = args.model if args.model.is_absolute() else backend_dir / args.model

    rows = read_rows(data_path)
    references = np.array([row["reference_price_aud"] for row in rows], dtype=float)
    model_predictions = predict_xgboost_aud(model_path, rows, args.exchange_rate)
    baseline_predictions = np.array([predict_rule_baseline_aud(row) for row in rows], dtype=float)

    print("# Pricing Model Validation")
    print()
    print(f"Dataset: `{data_path.relative_to(backend_dir)}`")
    print(f"Rows: {len(rows)}")
    print(f"Reference type: {rows[0]['reference_type'] if rows else 'n/a'}")
    print(f"USD to AUD exchange rate: {args.exchange_rate:.2f}")
    print()
    print("Baseline formula:")
    print()
    print("```text")
    print("baseline_aud = 250 + distance_miles * 2.0 + weight_lbs * 0.006 + actual_duration_hours * 15")
    print("```")
    print()
    print("| Model | MAE (AUD) | RMSE (AUD) | R2 |")
    print("| --- | ---: | ---: | ---: |")
    for name, predictions in [
        ("Rule-based baseline", baseline_predictions),
        ("XGBoost pricing model", model_predictions),
    ]:
        scores = score_predictions(references, predictions)
        print(f"| {name} | {scores['mae']:.2f} | {scores['rmse']:.2f} | {scores['r2']:.3f} |")

    if not args.hide_rows:
        print()
        print("| Scenario | Reference AUD | Baseline AUD | XGBoost AUD |")
        print("| --- | ---: | ---: | ---: |")
        for row, baseline, model in zip(rows, baseline_predictions, model_predictions):
            print(f"| {row['scenario']} | {row['reference_price_aud']:.0f} | {baseline:.0f} | {model:.0f} |")

    print()
    print("Note: this benchmark is synthetic demo support, not production-grade freight pricing validation.")
    print()
    print("Demo reminder:")
    print(
        "- Reference AUD values are synthetic benchmark targets, not real market prices. "
        "Use these results to explain the validation method, sanity-check pricing behaviour, "
        "and compare XGBoost against a simple baseline."
    )
    print(
        "- Do not present the MAE/RMSE/R2 numbers as proof of real-world pricing accuracy. "
        "Production validation would require real or anonymised historical freight pricing data."
    )


def read_rows(path: Path) -> list[dict[str, float | str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, float | str]] = []
        for row in reader:
            rows.append(
                {
                    "scenario": row["scenario"],
                    "origin": row["origin"],
                    "destination": row["destination"],
                    "weight_kg": parse_float(row["weight_kg"]),
                    "weight_lbs": parse_float(row["weight_lbs"]),
                    "typical_distance_miles": parse_float(row["typical_distance_miles"]),
                    "actual_duration_hours": parse_float(row["actual_duration_hours"]),
                    "reference_price_aud": parse_float(row["reference_price_aud"]),
                    "reference_type": row["reference_type"],
                }
            )
    if not rows:
        raise ValueError(f"No validation rows found in {path}")
    return rows


def parse_float(value: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed):
        raise ValueError(f"Expected finite number, got {value!r}")
    return parsed


def predict_xgboost_aud(model_path: Path, rows: list[dict[str, float | str]], exchange_rate: float) -> np.ndarray:
    model = xgb.Booster()
    model.load_model(str(model_path))
    matrix = np.array([[float(row[name]) for name in FEATURE_NAMES] for row in rows], dtype=float)
    predictions_log_usd = model.predict(xgb.DMatrix(matrix, feature_names=FEATURE_NAMES))
    return np.expm1(predictions_log_usd) * exchange_rate


def predict_rule_baseline_aud(row: dict[str, float | str]) -> float:
    distance = float(row["typical_distance_miles"])
    weight = float(row["weight_lbs"])
    duration = float(row["actual_duration_hours"])
    return 250 + distance * 2.0 + weight * 0.006 + duration * 15


def score_predictions(references: np.ndarray, predictions: np.ndarray) -> dict[str, float]:
    errors = predictions - references
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors**2)))
    total_variance = float(np.sum((references - np.mean(references)) ** 2))
    residual_variance = float(np.sum(errors**2))
    r2 = 1 - residual_variance / total_variance if total_variance else float("nan")
    return {"mae": mae, "rmse": rmse, "r2": r2}


if __name__ == "__main__":
    main()
