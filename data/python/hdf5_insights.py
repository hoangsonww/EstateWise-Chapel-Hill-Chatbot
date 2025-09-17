"""Build and read HDF5-based market insight archives for EstateWise."""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Tuple

import h5py
import numpy as np

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def _ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def _safe_float(value: Any) -> float:
    try:
        if value is None:
            return float("nan")
        num = float(value)
        if math.isnan(num):
            return float("nan")
        return num
    except (TypeError, ValueError):
        return float("nan")


def _safe_int(value: Any) -> int:
    try:
        if value is None:
            return 0
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _safe_str(value: Any, fallback: str = "Unknown") -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


# ---------------------------------------------------------------------------
# HDF5 writers/readers
# ---------------------------------------------------------------------------


def _write_property_group(h5: h5py.File, properties: List[Dict[str, Any]]) -> None:
    """Persist raw property metrics to the `properties` group."""

    group = h5.create_group("properties")
    str_dtype = h5py.string_dtype("utf-8")

    def arr(key: str, cast_fn) -> np.ndarray:
        return np.array([cast_fn(p.get(key)) for p in properties])

    group.create_dataset("zpid", data=arr("zpid", _safe_int), dtype="int64")
    group.create_dataset("price", data=arr("price", _safe_float), dtype="float64")
    group.create_dataset("bedrooms", data=arr("bedrooms", _safe_float), dtype="float64")
    group.create_dataset("bathrooms", data=arr("bathrooms", _safe_float), dtype="float64")
    group.create_dataset("livingArea", data=arr("livingArea", _safe_float), dtype="float64")
    group.create_dataset("latitude", data=arr("latitude", _safe_float), dtype="float64")
    group.create_dataset("longitude", data=arr("longitude", _safe_float), dtype="float64")
    group.create_dataset("pricePerSqft", data=arr("pricePerSqft", _safe_float), dtype="float64")
    group.create_dataset("city", data=arr("city", _safe_str), dtype=str_dtype)
    group.create_dataset("state", data=arr("state", _safe_str), dtype=str_dtype)
    group.create_dataset("homeType", data=arr("homeType", _safe_str), dtype=str_dtype)


def _compute_city_stats(properties: Iterable[Dict[str, Any]]) -> Tuple[List[str], List[int], List[float], List[float]]:
    totals: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "total_price": 0.0, "total_sqft": 0.0}
    )
    for prop in properties:
        city = _safe_str(prop.get("city"))
        price = _safe_float(prop.get("price"))
        sqft = _safe_float(prop.get("livingArea"))
        totals[city]["count"] += 1
        if not math.isnan(price):
            totals[city]["total_price"] += price
        if not math.isnan(sqft):
            totals[city]["total_sqft"] += sqft

    cities, counts, avg_price, avg_sqft = [], [], [], []
    for city, info in totals.items():
        cities.append(city)
        counts.append(int(info["count"]))
        if info["count"]:
            avg_price.append(info["total_price"] / info["count"])
            avg_sqft.append(info["total_sqft"] / info["count"] if info["total_sqft"] else float("nan"))
        else:
            avg_price.append(float("nan"))
            avg_sqft.append(float("nan"))
    return cities, counts, avg_price, avg_sqft


def _compute_home_type_mix(properties: Iterable[Dict[str, Any]]) -> Tuple[List[str], List[int], List[float]]:
    totals: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "total_price": 0.0})
    for prop in properties:
        home_type = _safe_str(prop.get("homeType"))
        price = _safe_float(prop.get("price"))
        totals[home_type]["count"] += 1
        if not math.isnan(price):
            totals[home_type]["total_price"] += price

    types, counts, avg_price = [], [], []
    for home_type, info in totals.items():
        types.append(home_type)
        counts.append(int(info["count"]))
        if info["count"]:
            avg_price.append(info["total_price"] / info["count"])
        else:
            avg_price.append(float("nan"))
    return types, counts, avg_price


def _compute_bedroom_bands(properties: Iterable[Dict[str, Any]]) -> Tuple[List[str], List[int]]:
    bands: Dict[str, int] = defaultdict(int)
    for prop in properties:
        bedrooms = prop.get("bedrooms")
        if bedrooms is None:
            label = "Unknown"
        else:
            value = int(round(_safe_float(bedrooms)))
            label = f"{value}+" if value >= 5 else str(value)
        bands[label] += 1
    labels = list(bands.keys())
    labels.sort(key=lambda x: (int(x[:-1]) if x.endswith("+") else int(x) if x.isdigit() else 99))
    return labels, [bands[label] for label in labels]


def _write_aggregations(h5: h5py.File, properties: List[Dict[str, Any]]) -> None:
    aggregations = h5.create_group("aggregations")
    str_dtype = h5py.string_dtype("utf-8")

    cities, counts, avg_price, avg_sqft = _compute_city_stats(properties)
    aggregations.create_dataset("city_names", data=np.array(cities, dtype=str_dtype))
    aggregations.create_dataset("city_counts", data=np.array(counts, dtype="int64"))
    aggregations.create_dataset("city_avg_price", data=np.array(avg_price, dtype="float64"))
    aggregations.create_dataset("city_avg_sqft", data=np.array(avg_sqft, dtype="float64"))

    home_types, ht_counts, ht_avg_price = _compute_home_type_mix(properties)
    aggregations.create_dataset("home_types", data=np.array(home_types, dtype=str_dtype))
    aggregations.create_dataset("home_type_counts", data=np.array(ht_counts, dtype="int64"))
    aggregations.create_dataset("home_type_avg_price", data=np.array(ht_avg_price, dtype="float64"))

    bands, band_counts = _compute_bedroom_bands(properties)
    aggregations.create_dataset("bedroom_bands", data=np.array(bands, dtype=str_dtype))
    aggregations.create_dataset("bedroom_counts", data=np.array(band_counts, dtype="int64"))

    prices = [_safe_float(p.get("price")) for p in properties]
    valid_prices = np.array([p for p in prices if not math.isnan(p)], dtype="float64")
    if valid_prices.size:
        quartiles = np.percentile(valid_prices, [0, 25, 50, 75, 100])
    else:
        quartiles = np.array([float("nan")] * 5, dtype="float64")
    aggregations.create_dataset("price_quartiles", data=quartiles)

    price_per_sqft = np.array(
        [
            p if not math.isnan(p) else float("nan")
            for p in [_safe_float(prop.get("pricePerSqft")) for prop in properties]
        ],
        dtype="float64",
    )
    valid_pps = price_per_sqft[~np.isnan(price_per_sqft)]
    if valid_pps.size:
        aggregations.create_dataset("price_per_sqft_mean", data=np.array([np.mean(valid_pps)]))
    else:
        aggregations.create_dataset("price_per_sqft_mean", data=np.array([float("nan")]))


def _write_global_metrics(h5: h5py.File, properties: List[Dict[str, Any]]) -> None:
    metrics = h5.create_group("global_metrics")
    prices = np.array([_safe_float(p.get("price")) for p in properties], dtype="float64")
    living_area = np.array([_safe_float(p.get("livingArea")) for p in properties], dtype="float64")

    valid_prices = prices[~np.isnan(prices)]
    valid_living = living_area[~np.isnan(living_area)]

    metrics.attrs["total_properties"] = len(properties)
    metrics.attrs["average_price"] = float(np.mean(valid_prices)) if valid_prices.size else float("nan")
    metrics.attrs["median_price"] = float(np.median(valid_prices)) if valid_prices.size else float("nan")
    metrics.attrs["average_living_area"] = float(np.mean(valid_living)) if valid_living.size else float("nan")

    price_per_sqft = []
    for price, area in zip(prices, living_area):
        if math.isnan(price) or math.isnan(area) or area <= 0:
            continue
        price_per_sqft.append(price / area)
    metrics.attrs["average_price_per_sqft"] = float(np.mean(price_per_sqft)) if price_per_sqft else float("nan")


def build_archive(properties: List[Dict[str, Any]], file_path: str) -> Dict[str, Any]:
    _ensure_parent_dir(file_path)

    with h5py.File(file_path, "w") as h5:
        _write_property_group(h5, properties)
        _write_aggregations(h5, properties)
        _write_global_metrics(h5, properties)

    return {"status": "ok", "propertiesStored": len(properties)}


# ---------------------------------------------------------------------------
# Reading helpers
# ---------------------------------------------------------------------------


def _dataset_to_list(dataset) -> List[Any]:
    values = dataset[()]
    if isinstance(values, bytes):
        return [values.decode("utf-8")]
    if isinstance(values, np.ndarray):
        if values.dtype.kind in {"S", "O"}:
            return [v.decode("utf-8") if isinstance(v, (bytes, np.bytes_)) else str(v) for v in values]
        return values.tolist()
    return [values]


def _maybe(value: Any) -> Any:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def read_archive(file_path: str) -> Dict[str, Any]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    with h5py.File(file_path, "r") as h5:
        aggregations = h5["aggregations"]
        cities = _dataset_to_list(aggregations["city_names"])
        counts = _dataset_to_list(aggregations["city_counts"])
        avg_price = _dataset_to_list(aggregations["city_avg_price"])
        avg_sqft = _dataset_to_list(aggregations["city_avg_sqft"])

        city_summary = []
        for name, count, price, sqft in zip(cities, counts, avg_price, avg_sqft):
            city_summary.append(
                {
                    "city": name,
                    "properties": int(count),
                    "averagePrice": _maybe(float(price)),
                    "averageLivingArea": _maybe(float(sqft)),
                }
            )

        home_types = _dataset_to_list(aggregations["home_types"])
        home_counts = _dataset_to_list(aggregations["home_type_counts"])
        home_avg_price = _dataset_to_list(aggregations["home_type_avg_price"])
        home_type_mix = []
        for name, count, price in zip(home_types, home_counts, home_avg_price):
            home_type_mix.append(
                {
                    "homeType": name,
                    "properties": int(count),
                    "averagePrice": _maybe(float(price)),
                }
            )

        bedroom_bands = _dataset_to_list(aggregations["bedroom_bands"])
        bedroom_counts = _dataset_to_list(aggregations["bedroom_counts"])
        bedroom_mix = []
        for label, count in zip(bedroom_bands, bedroom_counts):
            bedroom_mix.append({"band": label, "properties": int(count)})

        price_quartiles = [
            _maybe(float(v)) for v in _dataset_to_list(aggregations["price_quartiles"])
        ]
        avg_price_per_sqft = _maybe(
            float(_dataset_to_list(aggregations["price_per_sqft_mean"])[0])
        )

        metrics_group = h5["global_metrics"]
        metrics = {
            key: _maybe(float(value))
            for key, value in metrics_group.attrs.items()
        }

    return {
        "cityPriceSummary": city_summary,
        "homeTypeSummary": home_type_mix,
        "bedroomDistribution": bedroom_mix,
        "priceQuartiles": {
            "min": price_quartiles[0],
            "q1": price_quartiles[1],
            "median": price_quartiles[2],
            "q3": price_quartiles[3],
            "max": price_quartiles[4],
        },
        "averagePricePerSqft": avg_price_per_sqft,
        "marketTotals": metrics,
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def _parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["write", "read"], help="Operation to execute")
    parser.add_argument("--file", default=os.path.join("data", "hdf5", "property_insights.h5"))
    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])

    try:
        if args.operation == "write":
            payload = json.load(sys.stdin)
            properties = payload.get("properties", [])
            result = build_archive(properties, args.file)
            print(json.dumps(result))
        else:
            insights = read_archive(args.file)
            print(json.dumps(insights))
    except Exception as exc:  # pragma: no cover - surfaced to caller
        error = {"status": "error", "message": str(exc)}
        print(json.dumps(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
