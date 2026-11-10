import pandas as pd
import numpy as np


def _safe_value(value):
    """Convert values into JSON-safe Python values."""

    if pd.isna(value):
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def _find_column(question, columns):
    """Find a column mentioned in the user's question."""

    question = question.lower()

    sorted_columns = sorted(
        columns,
        key=lambda column: len(str(column)),
        reverse=True
    )

    for column in sorted_columns:
        if str(column).lower() in question:
            return column

    return None


def _records_to_json(df):
    """Convert a DataFrame into JSON-safe records."""

    records = []

    for record in df.to_dict(orient="records"):
        records.append({
            str(key): _safe_value(value)
            for key, value in record.items()
        })

    return records


def generate_ai_chart(df, question):
    """
    Understand a chart request and generate chart data
    using the selected dataset.
    """

    question = question.strip().lower()

    if df.empty:
        return {
            "success": False,
            "message": "The selected dataset is empty."
        }

    columns = list(df.columns)

    numeric_columns = list(
        df.select_dtypes(include=np.number).columns
    )

    categorical_columns = [
        column for column in columns
        if column not in numeric_columns
    ]

    if not numeric_columns and not categorical_columns:
        return {
            "success": False,
            "message": "No suitable columns were found for chart generation."
        }

    # Identify columns mentioned in the question.
    first_column = _find_column(question, columns)

    mentioned_columns = [
        column for column in columns
        if str(column).lower() in question
    ]

    # --------------------------------------------------
    # 1. SCATTER CHART
    # --------------------------------------------------

    if any(word in question for word in [
        "scatter", "relationship", "compare",
        "comparison", "against", "versus"
    ]) and len(mentioned_columns) >= 2:

        x_column = mentioned_columns[0]
        y_column = mentioned_columns[1]

        if (
            x_column not in numeric_columns
            or y_column not in numeric_columns
        ):
            return {
                "success": False,
                "message": "Scatter charts require two numerical columns."
            }

        chart_df = df[[x_column, y_column]].dropna().head(500)

        return {
            "success": True,
            "chart": {
                "chart_type": "scatter",
                "title": f"{x_column} vs {y_column}",
                "x_key": str(x_column),
                "y_key": str(y_column),
                "data": _records_to_json(chart_df),
                "explanation": (
                    f"This scatter chart displays the relationship "
                    f"between {x_column} and {y_column}. "
                    "It helps identify patterns and possible associations."
                )
            }
        }

    # --------------------------------------------------
    # 2. HISTOGRAM
    # --------------------------------------------------

    if any(word in question for word in [
        "histogram", "distribution", "spread"
    ]):

        target_column = (
            first_column
            if first_column in numeric_columns
            else (numeric_columns[0] if numeric_columns else None)
        )

        if target_column is None:
            return {
                "success": False,
                "message": "A histogram requires a numerical column."
            }

        values = pd.to_numeric(
            df[target_column],
            errors="coerce"
        ).dropna()

        if values.empty:
            return {
                "success": False,
                "message": "No valid numerical values were found."
            }

        counts, edges = np.histogram(
            values,
            bins=min(10, max(1, len(values)))
        )

        histogram_data = []

        for index, count in enumerate(counts):
            histogram_data.append({
                "range": (
                    f"{edges[index]:.2f} - {edges[index + 1]:.2f}"
                ),
                "count": int(count)
            })

        return {
            "success": True,
            "chart": {
                "chart_type": "histogram",
                "title": f"Distribution of {target_column}",
                "x_key": "range",
                "y_key": "count",
                "data": histogram_data,
                "explanation": (
                    f"This histogram groups the values of {target_column} "
                    "into ranges and shows how frequently values occur."
                )
            }
        }

    # --------------------------------------------------
    # 3. CATEGORY COUNT BAR CHART
    # --------------------------------------------------

    if any(word in question for word in [
        "count", "frequency", "employees",
        "records", "number of"
    ]) and first_column in categorical_columns:

        counts = (
            df[first_column]
            .dropna()
            .astype(str)
            .value_counts()
            .head(15)
            .reset_index()
        )

        counts.columns = ["category", "count"]

        return {
            "success": True,
            "chart": {
                "chart_type": "bar",
                "title": f"Count by {first_column}",
                "x_key": "category",
                "y_key": "count",
                "data": _records_to_json(counts),
                "explanation": (
                    f"This chart shows the number of records "
                    f"belonging to each {first_column} category."
                )
            }
        }

    # --------------------------------------------------
    # 4. GROUPED BAR CHART
    # --------------------------------------------------

    if any(word in question for word in [
        "by", "per", "department", "region",
        "category", "group"
    ]):

        group_column = None

        for column in categorical_columns:
            if str(column).lower() in question:
                group_column = column
                break

        target_column = None

        for column in numeric_columns:
            if str(column).lower() in question:
                target_column = column
                break

        if group_column is not None and target_column is not None:

            aggregation = "mean"

            if "sum" in question or "total" in question:
                aggregation = "sum"
            elif "maximum" in question or "highest" in question:
                aggregation = "max"
            elif "minimum" in question or "lowest" in question:
                aggregation = "min"
            elif "count" in question:
                aggregation = "count"

            if aggregation == "count":
                grouped = (
                    df.groupby(group_column, dropna=False)
                    .size()
                    .reset_index(name="count")
                )
                value_column = "count"

            else:
                grouped = (
                    df.groupby(group_column, dropna=False)[target_column]
                    .agg(aggregation)
                    .reset_index()
                )
                value_column = target_column

            grouped = grouped.sort_values(
                value_column,
                ascending=False
            ).head(15)

            grouped[group_column] = grouped[group_column].astype(str)

            return {
                "success": True,
                "chart": {
                    "chart_type": "bar",
                    "title": (
                        f"{aggregation.title()} {value_column} "
                        f"by {group_column}"
                    ),
                    "x_key": str(group_column),
                    "y_key": str(value_column),
                    "data": _records_to_json(grouped),
                    "explanation": (
                        f"This chart displays the {aggregation} of "
                        f"{value_column} for each {group_column}."
                    )
                }
            }

    # --------------------------------------------------
    # 5. LINE CHART
    # --------------------------------------------------

    if any(word in question for word in [
        "line chart", "trend", "over time"
    ]):

        date_column = None

        for column in columns:
            if (
                pd.api.types.is_datetime64_any_dtype(df[column])
                or any(word in str(column).lower() for word in [
                    "date", "month", "year", "time"
                ])
            ):
                converted = pd.to_datetime(
                    df[column],
                    errors="coerce"
                )

                if converted.notna().sum() > 0:
                    date_column = column
                    break

        target_column = (
            first_column
            if first_column in numeric_columns
            else (numeric_columns[0] if numeric_columns else None)
        )

        if date_column is None or target_column is None:
            return {
                "success": False,
                "message": (
                    "A trend chart requires a usable date/time column "
                    "and a numerical column."
                )
            }

        trend_df = pd.DataFrame({
            "date": pd.to_datetime(
                df[date_column],
                errors="coerce"
            ),
            "value": pd.to_numeric(
                df[target_column],
                errors="coerce"
            )
        }).dropna()

        trend_df = (
            trend_df.groupby("date", as_index=False)["value"]
            .mean()
            .sort_values("date")
            .head(500)
        )

        trend_df["date"] = trend_df["date"].astype(str)

        return {
            "success": True,
            "chart": {
                "chart_type": "line",
                "title": f"{target_column} Trend",
                "x_key": "date",
                "y_key": "value",
                "data": _records_to_json(trend_df),
                "explanation": (
                    f"This line chart displays how {target_column} "
                    f"changes over time using {date_column}."
                )
            }
        }

    # --------------------------------------------------
    # 6. AUTOMATIC CHART RECOMMENDATION
    # --------------------------------------------------

    if numeric_columns:

        target_column = (
            first_column
            if first_column in numeric_columns
            else numeric_columns[0]
        )

        values = pd.to_numeric(
            df[target_column],
            errors="coerce"
        ).dropna()

        if values.empty:
            return {
                "success": False,
                "message": "No valid numerical values are available for charting."
            }

        counts, edges = np.histogram(
            values,
            bins=min(10, max(1, len(values)))
        )

        histogram_data = [
            {
                "range": (
                    f"{edges[index]:.2f} - {edges[index + 1]:.2f}"
                ),
                "count": int(count)
            }
            for index, count in enumerate(counts)
        ]

        return {
            "success": True,
            "chart": {
                "chart_type": "histogram",
                "title": f"Distribution of {target_column}",
                "x_key": "range",
                "y_key": "count",
                "data": histogram_data,
                "explanation": (
                    f"DATASTORY automatically selected a histogram "
                    f"to explore the distribution of {target_column}."
                )
            }
        }

    # Categorical-only dataset fallback.
    if categorical_columns:

        target_column = (
            first_column
            if first_column in categorical_columns
            else categorical_columns[0]
        )

        counts = (
            df[target_column]
            .dropna()
            .astype(str)
            .value_counts()
            .head(15)
            .reset_index()
        )

        counts.columns = ["category", "count"]

        return {
            "success": True,
            "chart": {
                "chart_type": "bar",
                "title": f"Distribution of {target_column}",
                "x_key": "category",
                "y_key": "count",
                "data": _records_to_json(counts),
                "explanation": (
                    f"DATASTORY automatically selected a bar chart "
                    f"to show the most frequent values in {target_column}."
                )
            }
        }

    return {
        "success": False,
        "message": "DATASTORY could not find suitable data for a chart."
    }