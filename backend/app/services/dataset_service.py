import pandas as pd
import json
from pathlib import Path


SUPPORTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".json"]


def load_dataset(file_path: str) -> pd.DataFrame:
    """
    Load a supported dataset using Pandas.
    """

    path = Path(file_path)

    extension = path.suffix.lower()

    if extension == ".csv":
        return pd.read_csv(path)

    elif extension in [".xlsx", ".xls"]:
        return pd.read_excel(path)

    elif extension == ".json":
        return pd.read_json(path)

    else:
        raise ValueError(
            f"Unsupported file format: {extension}"
        )


def profile_dataset(df: pd.DataFrame) -> dict:
    """
    Generate a basic profile of an uploaded dataset.
    """

    missing_values = df.isnull().sum()

    column_types = {
        column: str(dtype)
        for column, dtype in df.dtypes.items()
    }

    return {
        "total_rows": int(df.shape[0]),

        "total_columns": int(df.shape[1]),

        "total_missing_values": int(
            missing_values.sum()
        ),

        "duplicate_rows": int(
            df.duplicated().sum()
        ),

        "columns": list(df.columns),

        "column_types": column_types,

        "missing_values": {
            column: int(value)
            for column, value in missing_values.items()
        }
    }


def get_dataset_preview(
    df: pd.DataFrame,
    limit: int = 10
) -> dict:
    """
    Return a preview of the uploaded dataset.
    """

    preview = df.head(limit)

    safe_preview = preview.astype(object).where(
        pd.notna(preview),
        None
    )

    return {
        "columns": list(df.columns),

        "rows": safe_preview.to_dict(
            orient="records"
        )
    }

import pandas as pd
import numpy as np


def analyze_dataset(df):
    """
    Generate statistical analysis and data quality information
    for an uploaded dataset.
    """

    # Basic dataset information
    total_rows = int(df.shape[0])
    total_columns = int(df.shape[1])

    # Missing values
    missing_values = df.isnull().sum()

    # Duplicate rows
    duplicate_rows = int(df.duplicated().sum())

    # Column analysis
    column_analysis = []

    for column in df.columns:

        series = df[column]

        column_info = {
            "column_name": str(column),
            "data_type": str(series.dtype),
            "total_values": int(series.count()),
            "missing_values": int(series.isnull().sum()),
            "unique_values": int(series.nunique()),
        }

        column_analysis.append(column_info)

    # Statistical summary
    statistical_summary = {}

    numeric_columns = df.select_dtypes(include=np.number)

    if not numeric_columns.empty:

        summary = numeric_columns.describe().replace(
            [np.inf, -np.inf], np.nan
        )

        for column in summary.columns:

            statistical_summary[str(column)] = {
                key: (
                    None if pd.isna(value) else round(float(value), 3)
                )
                for key, value in summary[column].items()
            }

    # Data quality score
    total_cells = total_rows * total_columns

    if total_cells > 0:
        missing_percentage = (
            int(missing_values.sum()) / total_cells
        ) * 100

        duplicate_percentage = (
            duplicate_rows / total_rows
        ) * 100

        quality_score = max(
            0,
            round(100 - missing_percentage - duplicate_percentage, 2)
        )
    else:
        missing_percentage = 0
        duplicate_percentage = 0
        quality_score = 0

    return {
        "overview": {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "total_missing_values": int(missing_values.sum()),
            "duplicate_rows": duplicate_rows,
        },
        "column_analysis": column_analysis,
        "statistical_summary": statistical_summary,
        "data_quality": {
            "quality_score": quality_score,
            "missing_percentage": round(missing_percentage, 2),
            "duplicate_percentage": round(duplicate_percentage, 2),
        }
    }

def generate_visualization_data(df):
    """
    Prepare dataset information for automatic charts
    and the manual chart builder.
    """

    numeric_df = df.select_dtypes(include=np.number)

    # Identify numerical and categorical columns
    numeric_columns = [str(col) for col in numeric_df.columns]

    categorical_columns = [
        str(col)
        for col in df.columns
        if col not in numeric_df.columns
    ]

    # Prepare up to 500 records for frontend charts
    chart_df = df.head(500).astype(object)
    chart_df = chart_df.where(pd.notna(chart_df), None)

    chart_data = []

    for record in chart_df.to_dict(orient="records"):
        clean_record = {}

        for key, value in record.items():
            if value is None:
                clean_record[str(key)] = None
            elif isinstance(value, (np.integer, np.floating)):
                clean_record[str(key)] = (
                    value.item()
                    if np.isfinite(value)
                    else None
                )
            elif isinstance(value, (pd.Timestamp,)):
                clean_record[str(key)] = value.isoformat()
            elif isinstance(value, (str, int, float, bool)):
                clean_record[str(key)] = value
            else:
                clean_record[str(key)] = str(value)

        chart_data.append(clean_record)

    # Calculate category frequencies
    category_summaries = {}

    for column in df.select_dtypes(
        include=["object", "category", "string"]
    ).columns:

        counts = (
            df[column]
            .dropna()
            .astype(str)
            .value_counts()
            .head(10)
        )

        category_summaries[str(column)] = [
            {
                "label": str(label),
                "count": int(count)
            }
            for label, count in counts.items()
        ]

    # Calculate correlation matrix
    correlation_matrix = {}

    if len(numeric_columns) >= 2:
        correlations = numeric_df.corr()

        for column in correlations.columns:
            correlation_matrix[str(column)] = {}

            for other_column in correlations.columns:
                value = correlations.loc[column, other_column]

                correlation_matrix[str(column)][str(other_column)] = (
                    None if pd.isna(value) else round(float(value), 3)
                )

    return {
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "chart_data": chart_data,
        "category_summaries": category_summaries,
        "correlation_matrix": correlation_matrix,
        "total_records": int(len(df)),
        "records_returned": len(chart_data),
        "sample_limit": 500
    }

def generate_business_insights(df: pd.DataFrame) -> dict:
    """
    Generate business insights from the actual dataset.

    Includes:
    - Dataset overview
    - Numerical findings
    - Categorical findings
    - Correlation patterns
    - Potential outliers
    - Data quality observations
    - Business recommendations

    All findings are calculated from the uploaded data.
    """

    insights = []

    numeric_df = df.select_dtypes(include=np.number)

    categorical_columns = df.select_dtypes(
        include=["object", "category", "string"]
    ).columns.tolist()

    total_rows = int(len(df))
    total_columns = int(len(df.columns))

    # -------------------------------------------------
    # 1. DATASET OVERVIEW
    # -------------------------------------------------

    insights.append({
        "category": "Overview",
        "title": "Dataset Overview",
        "description": (
            f"The dataset contains {total_rows:,} records "
            f"and {total_columns} columns."
        ),
        "importance": "info"
    })

    # -------------------------------------------------
    # 2. DATA QUALITY INSIGHTS
    # -------------------------------------------------

    missing_total = int(df.isnull().sum().sum())
    duplicate_total = int(df.duplicated().sum())

    if missing_total > 0:

        missing_percentage = round(
            (missing_total / max(total_rows * total_columns, 1)) * 100,
            2
        )

        insights.append({
            "category": "Data Quality",
            "title": "Missing Values Detected",
            "description": (
                f"The dataset contains {missing_total:,} missing values "
                f"({missing_percentage}% of all cells). "
                "Review these columns before performing further analysis."
            ),
            "importance": "warning",
            "value": missing_total
        })

    else:

        insights.append({
            "category": "Data Quality",
            "title": "No Missing Values",
            "description": (
                "No missing values were detected in the dataset."
            ),
            "importance": "success"
        })

    if duplicate_total > 0:

        insights.append({
            "category": "Data Quality",
            "title": "Duplicate Records Found",
            "description": (
                f"The dataset contains {duplicate_total:,} duplicate rows. "
                "Review them to determine whether they should be removed."
            ),
            "importance": "warning",
            "value": duplicate_total
        })

    else:

        insights.append({
            "category": "Data Quality",
            "title": "No Duplicate Records",
            "description": (
                "No completely duplicated rows were detected."
            ),
            "importance": "success"
        })

    # -------------------------------------------------
    # 3. NUMERICAL COLUMN INSIGHTS
    # -------------------------------------------------

    for column in numeric_df.columns:

        series = numeric_df[column].replace(
            [np.inf, -np.inf],
            np.nan
        ).dropna()

        if len(series) == 0:
            continue

        column_name = str(column)

        average = float(series.mean())
        median = float(series.median())
        minimum = float(series.min())
        maximum = float(series.max())

        insights.append({
            "category": "Numerical Analysis",
            "title": f"{column_name} Summary",
            "description": (
                f"The average {column_name} is {average:,.2f}, "
                f"the median is {median:,.2f}, "
                f"the minimum is {minimum:,.2f}, "
                f"and the maximum is {maximum:,.2f}."
            ),
            "importance": "info",
            "column": column_name,
            "metrics": {
                "average": round(average, 3),
                "median": round(median, 3),
                "minimum": round(minimum, 3),
                "maximum": round(maximum, 3),
                "valid_values": int(len(series))
            }
        })

        # -------------------------------------------------
        # 4. OUTLIER DETECTION USING IQR
        # -------------------------------------------------

        if len(series) >= 4:

            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))

            iqr = q3 - q1

            lower_limit = q1 - (1.5 * iqr)
            upper_limit = q3 + (1.5 * iqr)

            outliers = series[
                (series < lower_limit) |
                (series > upper_limit)
            ]

            if len(outliers) > 0:

                insights.append({
                    "category": "Anomaly Detection",
                    "title": f"Potential Outliers in {column_name}",
                    "description": (
                        f"{len(outliers):,} values in '{column_name}' "
                        "fall outside the IQR-based expected range. "
                        "These are potential outliers and should be reviewed."
                    ),
                    "importance": "warning",
                    "column": column_name,
                    "metrics": {
                        "outlier_count": int(len(outliers)),
                        "lower_limit": round(lower_limit, 3),
                        "upper_limit": round(upper_limit, 3)
                    }
                })

    # -------------------------------------------------
    # 5. CATEGORICAL COLUMN INSIGHTS
    # -------------------------------------------------

    for column in categorical_columns:

        series = df[column].dropna()

        if series.empty:
            continue

        counts = series.astype(str).value_counts()

        if counts.empty:
            continue

        top_category = str(counts.index[0])
        top_count = int(counts.iloc[0])

        insights.append({
            "category": "Category Analysis",
            "title": f"Most Common {column}",
            "description": (
                f"'{top_category}' is the most common value "
                f"in '{column}', appearing {top_count:,} times."
            ),
            "importance": "info",
            "column": str(column),
            "metrics": {
                "most_common_value": top_category,
                "count": top_count,
                "unique_categories": int(series.nunique())
            }
        })

    # -------------------------------------------------
    # 6. CATEGORY-WISE NUMERICAL COMPARISON
    # -------------------------------------------------

    for category_column in categorical_columns:

        for numeric_column in numeric_df.columns:

            temp = df[
                [category_column, numeric_column]
            ].copy()

            temp[numeric_column] = pd.to_numeric(
                temp[numeric_column],
                errors="coerce"
            )

            temp = temp.dropna()

            if temp.empty:
                continue

            grouped = (
                temp.groupby(category_column)[numeric_column]
                .mean()
                .sort_values(ascending=False)
            )

            if len(grouped) < 2:
                continue

            highest_category = str(grouped.index[0])
            highest_value = float(grouped.iloc[0])

            lowest_category = str(grouped.index[-1])
            lowest_value = float(grouped.iloc[-1])

            insights.append({
                "category": "Business Comparison",
                "title": (
                    f"{numeric_column} by {category_column}"
                ),
                "description": (
                    f"'{highest_category}' has the highest average "
                    f"{numeric_column} ({highest_value:,.2f}), "
                    f"while '{lowest_category}' has the lowest "
                    f"({lowest_value:,.2f})."
                ),
                "importance": "success",
                "metrics": {
                    "group_column": str(category_column),
                    "analysis_column": str(numeric_column),
                    "highest_category": highest_category,
                    "highest_average": round(highest_value, 3),
                    "lowest_category": lowest_category,
                    "lowest_average": round(lowest_value, 3)
                }
            })

    # -------------------------------------------------
    # 7. CORRELATION ANALYSIS
    # -------------------------------------------------

    if len(numeric_df.columns) >= 2:

        correlation_matrix = numeric_df.corr()

        columns = list(correlation_matrix.columns)

        for i in range(len(columns)):

            for j in range(i + 1, len(columns)):

                first_column = columns[i]
                second_column = columns[j]

                correlation = correlation_matrix.loc[
                    first_column,
                    second_column
                ]

                if pd.isna(correlation):
                    continue

                correlation = float(correlation)

                if abs(correlation) >= 0.7:

                    relationship = (
                        "strong positive"
                        if correlation > 0
                        else "strong negative"
                    )

                    insights.append({
                        "category": "Correlation Analysis",
                        "title": (
                            f"{first_column} and {second_column}"
                        ),
                        "description": (
                            f"'{first_column}' and '{second_column}' "
                            f"have a {relationship} correlation "
                            f"of {correlation:.3f}. "
                            "Correlation does not establish causation."
                        ),
                        "importance": "info",
                        "metrics": {
                            "first_column": str(first_column),
                            "second_column": str(second_column),
                            "correlation": round(correlation, 3),
                            "relationship": relationship
                        }
                    })

    # -------------------------------------------------
    # 8. BUSINESS RECOMMENDATIONS
    # -------------------------------------------------

    recommendations = []

    if missing_total > 0:

        recommendations.append({
            "title": "Review Missing Data",
            "description": (
                "Inspect columns containing missing values "
                "and decide whether to fill, retain, or remove them."
            )
        })

    if duplicate_total > 0:

        recommendations.append({
            "title": "Review Duplicate Records",
            "description": (
                "Check duplicate rows before deciding whether "
                "they represent repeated transactions or data errors."
            )
        })

    if len(numeric_df.columns) > 0:

        recommendations.append({
            "title": "Explore Numerical Distributions",
            "description": (
                "Use histograms and box plots to understand "
                "the distribution and spread of numerical columns."
            )
        })

    if len(categorical_columns) > 0 and len(numeric_df.columns) > 0:

        recommendations.append({
            "title": "Compare Business Categories",
            "description": (
                "Compare numerical metrics across categories "
                "to identify differences and possible opportunities."
            )
        })

    if not recommendations:

        recommendations.append({
            "title": "Continue Exploring",
            "description": (
                "The dataset passed the basic quality checks. "
                "Explore its relationships, distributions, and trends."
            )
        })

    # -------------------------------------------------
    # 9. EXECUTIVE SUMMARY
    # -------------------------------------------------

    executive_summary = (
        f"DATASTORY analyzed {total_rows:,} records "
        f"across {total_columns} columns. "
        f"It identified {len(insights)} findings, "
        f"including {missing_total:,} missing values "
        f"and {duplicate_total:,} duplicate rows. "
        "Review the findings and recommendations "
        "to understand the dataset further."
    )

    return {
        "executive_summary": executive_summary,
        "dataset_overview": {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "numeric_columns": int(len(numeric_df.columns)),
            "categorical_columns": int(len(categorical_columns)),
            "missing_values": missing_total,
            "duplicate_rows": duplicate_total
        },
        "total_insights": len(insights),
        "insights": insights,
        "recommendations": recommendations
    }