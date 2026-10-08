import json
from datetime import timedelta

import numpy as np
import pandas as pd

from backend.runtime import json_safe


def test_nested_scientific_values_are_strict_json():
    source = {
        "results": pd.DataFrame({"Position": [np.float64(1), np.nan],
                                 "Time": [pd.Timedelta(seconds=90.5), pd.NaT]}),
        "weather": pd.Series({"Temperature": np.float64(24.5), "Missing": np.nan}),
        "duration": timedelta(seconds=2.25),
        "invalid": [np.inf, -np.inf, pd.NA, pd.NaT],
        "date": pd.Timestamp("2024-03-02T12:00:00"),
    }
    converted = json_safe(source)
    json.dumps(converted, allow_nan=False)
    assert converted["results"] == [{"Position": 1.0, "Time": 90.5},
                                    {"Position": None, "Time": None}]
    assert converted["duration"] == 2.25
    assert converted["invalid"] == [None] * 4
    assert converted["weather"]["Missing"] is None
    assert converted["date"].startswith("2024-03-02")
