import re
import pandas as pd
import numpy as np


def _clean_value(value):
    """Convert Pandas and NumPy values into JSON-safe values."""
    if pd.isna(value):
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    return value


def _find_column(question, columns):
    """Find a dataset column mentioned in the user's question."""
    question_lower = question.lower()

    # Prefer the longest matching column name.
    sorted_columns = sorted(
        columns,
        key=lambda column: len(str(column)),
        reverse=True
    )

    for column in sorted_columns:
        column_name = str(column).lower()

        if column_name in question_lower:
            return column

    return None


def _format_number(value):
    """Format numeric answers for readable display."""
    if pd.isna(value):
        return "Not available"

    value = float(value)

    if value.is_integer():
        return f"{int(value):,}"

    return f"{value:,.2f}"


def answer_dataset_question(df: pd.DataFrame, question: str) -> dict:
    """
    Answer common natural-language questions using Pandas calculations.
    All answers are calculated from the selected dataset.
    """

    question = question.strip()
    text = question.lower()

    if not question:
        return {
            "answer": "Please enter a question.",
            "result": None,
            "explanation": "The question field cannot be empty."
        }

    if df.empty:
        return {
            "answer": "This dataset does not contain any records.",
            "result": None,
            "explanation": "Upload a dataset containing at least one row."
        }

    columns = list(df.columns)
    numeric_columns = list(
        df.select_dtypes(include=np.number).columns
    )

    selected_column = _find_column(question, columns)

    # 1. Dataset row and column count
    if any(word in text for word in [
        "how many rows", "number of rows", "total rows",
        "record count", "how many records", "row count"
    ]):
        total = len(df)

        return {
            "answer": f"Your dataset contains {total:,} rows.",
            "result": {
                "total_rows": int(total)
            },
            "explanation": "This is the total number of records in the selected dataset."
        }

    if any(word in text for word in [
        "how many columns", "number of columns", "total columns",
        "column count"
    ]):
        total = len(columns)

        return {
            "answer": f"Your dataset contains {total} columns.",
            "result": {
                "total_columns": int(total),
                "columns": [str(column) for column in columns]
            },
            "explanation": "This is the total number of columns available in the dataset."
        }

    # 2. Missing values
    if any(word in text for word in [
        "missing", "null", "empty values", "blank values"
    ]):
        if selected_column is not None:
            missing = int(df[selected_column].isna().sum())

            return {
                "answer": (
                    f"The column '{selected_column}' contains "
                    f"{missing:,} missing values."
                ),
                "result": {
                    "column": str(selected_column),
                    "missing_values": missing
                },
                "explanation": (
                    f"DATASTORY counted empty or null entries "
                    f"in the '{selected_column}' column."
                )
            }

        missing_by_column = {
            str(column): int(count)
            for column, count in df.isna().sum().items()
            if count > 0
        }

        total_missing = int(df.isna().sum().sum())

        return {
            "answer": (
                f"Your dataset contains {total_missing:,} missing values "
                f"across {len(missing_by_column)} columns."
            ),
            "result": {
                "total_missing_values": total_missing,
                "columns": missing_by_column
            },
            "explanation": "Missing values are counted separately for every column."
        }

    # 3. Duplicate rows
    if any(word in text for word in [
        "duplicate", "duplicates", "repeated rows"
    ]):
        duplicates = int(df.duplicated().sum())

        return {
            "answer": f"Your dataset contains {duplicates:,} duplicate rows.",
            "result": {
                "duplicate_rows": duplicates
            },
            "explanation": (
                "A row is considered a duplicate when all its column "
                "values match another row."
            )
        }

    # 4. Unique values
    if any(word in text for word in [
        "unique", "distinct", "different values"
    ]):
        if selected_column is None:
            return {
                "answer": "Please mention a column name.",
                "result": None,
                "explanation": (
                    "For example: How many unique values are in the Department column?"
                )
            }

        unique_count = int(df[selected_column].nunique())

        return {
            "answer": (
                f"The column '{selected_column}' contains "
                f"{unique_count:,} unique values."
            ),
            "result": {
                "column": str(selected_column),
                "unique_values": unique_count
            },
            "explanation": "Unique values are counted after excluding missing entries."
        }

    # 5. Correlation between two numeric columns
    if "correlation" in text or "correlate" in text:
        mentioned_columns = [
            column for column in columns
            if str(column).lower() in text
        ]

        if len(mentioned_columns) >= 2:
            first = mentioned_columns[0]
            second = mentioned_columns[1]

            if first not in numeric_columns or second not in numeric_columns:
                return {
                    "answer": "Correlation requires two numerical columns.",
                    "result": None,
                    "explanation": "Choose two columns containing numeric values."
                }

            correlation = df[[first, second]].corr().iloc[0, 1]

            if pd.isna(correlation):
                return {
                    "answer": "Correlation could not be calculated.",
                    "result": None,
                    "explanation": "One or both columns may have constant or insufficient values."
                }

            value = round(float(correlation), 3)

            if value > 0.7:
                strength = "strong positive"
            elif value > 0.3:
                strength = "moderate positive"
            elif value < -0.7:
                strength = "strong negative"
            elif value < -0.3:
                strength = "moderate negative"
            else:
                strength = "weak or no"

            return {
                "answer": (
                    f"The correlation between '{first}' and '{second}' "
                    f"is {value} ({strength} relationship)."
                ),
                "result": {
                    "first_column": str(first),
                    "second_column": str(second),
                    "correlation": value,
                    "relationship": strength
                },
                "explanation": (
                    "Correlation measures how two numerical columns move together. "
                    "It does not prove that one causes the other."
                )
            }

        return {
            "answer": "Please mention two numerical column names.",
            "result": None,
            "explanation": (
                "Example: What is the correlation between Age and Salary?"
            )
        }

    # 6. Group-wise analysis
    group_match = re.search(
        r"\b(?:by|per|for each|across each)\s+(.+?)(?:\?|$)",
        question,
        re.IGNORECASE
    )

    if group_match:
        group_text = group_match.group(1).strip().lower()
        group_column = None

        for column in sorted(
            columns,
            key=lambda item: len(str(item)),
            reverse=True
        ):
            if str(column).lower() in group_text:
                group_column = column
                break

        if group_column is None:
            group_column = _find_column(group_text, columns)

        if group_column is not None:
            aggregation = "mean"

            if any(word in text for word in ["sum", "total"]):
                aggregation = "sum"
            elif any(word in text for word in ["count", "number of"]):
                aggregation = "count"
            elif "maximum" in text or "highest" in text or "max" in text:
                aggregation = "max"
            elif "minimum" in text or "lowest" in text or "min" in text:
                aggregation = "min"
            elif "median" in text:
                aggregation = "median"

            target_column = selected_column

            if target_column is None or target_column == group_column:
                possible_targets = [
                    column for column in numeric_columns
                    if column != group_column
                ]

                if aggregation == "count":
                    target_column = group_column
                elif possible_targets:
                    target_column = possible_targets[0]

            if aggregation == "count":
                grouped = (
                    df.groupby(group_column, dropna=False)
                    .size()
                    .reset_index(name="count")
                )
                value_column = "count"

            elif target_column is not None and target_column in numeric_columns:
                grouped = (
                    df.groupby(group_column, dropna=False)[target_column]
                    .agg(aggregation)
                    .reset_index()
                )
                value_column = target_column

            else:
                return {
                    "answer": "I could not identify a numerical column for this calculation.",
                    "result": None,
                    "explanation": (
                        "Mention a numerical column, for example: "
                        "What is the average Salary by Department?"
                    )
                }

            grouped = grouped.sort_values(
                value_column,
                ascending=False
            ).head(20)

            records = [
                {
                    str(key): _clean_value(value)
                    for key, value in record.items()
                }
                for record in grouped.to_dict(orient="records")
            ]

            return {
                "answer": (
                    f"{aggregation.title()} {value_column} "
                    f"grouped by {group_column}."
                ),
                "result": {
                    "group_column": str(group_column),
                    "value_column": str(value_column),
                    "aggregation": aggregation,
                    "rows": records
                },
                "explanation": (
                    f"DATASTORY grouped the dataset by '{group_column}' "
                    f"and calculated {aggregation} for '{value_column}'. "
                    "The result is sorted from highest to lowest."
                )
            }

    # 7. Numeric column calculations
    if selected_column is not None and selected_column in numeric_columns:
        series = pd.to_numeric(
            df[selected_column],
            errors="coerce"
        ).dropna()

        if series.empty:
            return {
                "answer": f"No usable numeric values were found in '{selected_column}'.",
                "result": None,
                "explanation": "The selected column does not contain usable numeric data."
            }

        if any(word in text for word in ["average", "mean"]):
            operation = "mean"
            value = series.mean()

        elif "median" in text:
            operation = "median"
            value = series.median()

        elif "mode" in text:
            operation = "mode"
            modes = series.mode()
            value = modes.iloc[0] if not modes.empty else None

        elif any(word in text for word in ["sum", "total"]):
            operation = "sum"
            value = series.sum()

        elif any(word in text for word in ["maximum", "highest", "largest", "max"]):
            operation = "maximum"
            value = series.max()

        elif any(word in text for word in ["minimum", "lowest", "smallest", "min"]):
            operation = "minimum"
            value = series.min()

        elif "count" in text or "how many" in text:
            operation = "count"
            value = series.count()

        else:
            return {
                "answer": (
                    f"I found the column '{selected_column}', "
                    "but could not identify the calculation."
                ),
                "result": None,
                "explanation": (
                    "Try asking for its average, median, sum, minimum, maximum, or count."
                )
            }

        formatted = _format_number(value)

        return {
            "answer": (
                f"The {operation} of '{selected_column}' is {formatted}."
            ),
            "result": {
                "column": str(selected_column),
                "operation": operation,
                "value": _clean_value(value),
                "valid_values": int(series.count())
            },
            "explanation": (
                f"DATASTORY calculated the {operation} using "
                f"{series.count():,} valid numerical values "
                f"in the '{selected_column}' column."
            )
        }

        # Numerical and categorical column identification
    if any(phrase in text for phrase in [
        "numerical columns",
        "numeric columns",
        "number columns"
    ]):
        numerical = [str(column) for column in numeric_columns]

        categorical = [
            str(column)
            for column in columns
            if column not in numeric_columns
        ]

        return {
            "answer": (
                "Numerical columns: "
                + (", ".join(numerical) if numerical else "None found")
                + ". Categorical or other columns: "
                + (", ".join(categorical) if categorical else "None found")
                + "."
            ),
            "result": {
                "numerical_columns": numerical,
                "categorical_columns": categorical
            },
            "explanation": (
                "Numerical columns contain numeric data that can be used "
                "for mathematical calculations. Categorical columns "
                "usually represent labels or groups."
            )
        }

    # 8. General dataset summary
    if any(word in text for word in [
        "summarize", "summary", "overview", "describe dataset",
        "tell me about this dataset"
    ]):
        return {
            "answer": (
                f"This dataset contains {len(df):,} rows and "
                f"{len(columns)} columns, including "
                f"{len(numeric_columns)} numerical columns."
            ),
            "result": {
                "total_rows": int(len(df)),
                "total_columns": int(len(columns)),
                "numeric_columns": [str(c) for c in numeric_columns],
                "categorical_columns": [
                    str(c) for c in columns if c not in numeric_columns
                ],
                "missing_values": int(df.isna().sum().sum()),
                "duplicate_rows": int(df.duplicated().sum())
            },
            "explanation": (
                "This overview is calculated directly from the selected dataset."
            )
        }

    # 9. Unsupported question
    return {
        "answer": "I couldn't understand that question yet.",
        "result": None,
        "explanation": (
            "Try one of the suggested questions below, such as "
            "'What is the average Salary?', "
            "'How many missing values are there?', or "
            "'What is the average Salary by Department?'"
        )
    }