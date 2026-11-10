
import pandas as pd
import numpy as np

from app.services.report_intelligence_service import (
    generate_report_intelligence
)

def safe_value(value):
    """Convert NumPy and Pandas values into JSON-safe Python values."""
    if pd.isna(value):
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()

    return value


def detect_column_types(df):
    """Identify numeric, categorical and date columns."""

    numeric_columns = df.select_dtypes(include=np.number).columns.tolist()

    categorical_columns = [
        column for column in df.columns
        if column not in numeric_columns
        and df[column].nunique(dropna=True) <= 50
    ]

    date_columns = []

    for column in df.columns:
        if column in numeric_columns:
            continue

        try:
            converted = pd.to_datetime(df[column], errors="coerce")
            valid_ratio = converted.notna().mean()

            if valid_ratio >= 0.75:
                date_columns.append(column)
        except Exception:
            pass

    return numeric_columns, categorical_columns, date_columns


def generate_kpis(df, numeric_columns, categorical_columns):
    """Generate useful KPI cards from dataset calculations."""

    kpis = []

    kpis.append({
        "title": "Total Records",
        "value": int(len(df)),
        "description": "Total number of rows in the dataset",
        "format": "number"
    })

    kpis.append({
        "title": "Total Columns",
        "value": int(len(df.columns)),
        "description": "Number of available data fields",
        "format": "number"
    })

    missing_count = int(df.isna().sum().sum())

    kpis.append({
        "title": "Missing Values",
        "value": missing_count,
        "description": "Total missing cells across the dataset",
        "format": "number"
    })

    if numeric_columns:
        column = numeric_columns[0]
        total = df[column].sum()

        kpis.append({
            "title": f"Total {column}",
            "value": safe_value(total),
            "description": f"Sum of {column}",
            "format": "number"
        })

        kpis.append({
            "title": f"Average {column}",
            "value": safe_value(df[column].mean()),
            "description": f"Average value of {column}",
            "format": "number"
        })

    if categorical_columns:
        column = categorical_columns[0]

        kpis.append({
            "title": f"Unique {column}",
            "value": int(df[column].nunique(dropna=True)),
            "description": f"Number of distinct {column} values",
            "format": "number"
        })

    return kpis[:6]


def generate_chart_recommendations(df, numeric_columns, categorical_columns):
    """Create chart specifications for the frontend."""

    charts = []

    # Numerical distribution
    for column in numeric_columns[:2]:
        values = df[column].dropna()

        if len(values) > 0:
            charts.append({
                "chart_id": f"histogram_{column}",
                "title": f"Distribution of {column}",
                "chart_type": "histogram",
                "description": f"Shows how values of {column} are distributed.",
                "x_column": column,
                "y_column": None,
                "data": [
                    {"value": safe_value(value)}
                    for value in values.head(500).tolist()
                ]
            })

    # Category comparison
    if categorical_columns and numeric_columns:
        category = categorical_columns[0]
        numeric = numeric_columns[0]

        grouped = (
            df.groupby(category, dropna=False)[numeric]
            .mean()
            .sort_values(ascending=False)
            .head(10)
        )

        charts.append({
            "chart_id": f"bar_{category}_{numeric}",
            "title": f"Average {numeric} by {category}",
            "chart_type": "bar",
            "description": f"Compares average {numeric} across {category}.",
            "x_column": category,
            "y_column": numeric,
            "data": [
                {
                    "label": str(safe_value(index)),
                    "value": safe_value(value)
                }
                for index, value in grouped.items()
            ]
        })

        counts = df[category].fillna("Missing").astype(str).value_counts().head(8)

        charts.append({
            "chart_id": f"pie_{category}",
            "title": f"{category} Breakdown",
            "chart_type": "pie",
            "description": f"Shows the distribution of {category}.",
            "x_column": category,
            "y_column": None,
            "data": [
                {
                    "label": str(label),
                    "value": int(value)
                }
                for label, value in counts.items()
            ]
        })

    # Correlation chart data
    if len(numeric_columns) >= 2:
        correlation = df[numeric_columns].corr(numeric_only=True)

        charts.append({
            "chart_id": "correlation_matrix",
            "title": "Numerical Correlation Matrix",
            "chart_type": "correlation",
            "description": "Shows relationships between numerical columns.",
            "data": [
                {
                    "column": str(column),
                    "values": [
                        safe_value(value)
                        for value in correlation[column].tolist()
                    ]
                }
                for column in correlation.columns
            ],
            "columns": [str(column) for column in correlation.columns]
        })

    return charts[:6]


def generate_findings(df, numeric_columns, categorical_columns):
    """Generate findings using calculated dataset statistics."""

    findings = []

    missing_percentage = (
        df.isna().sum().sum() / (len(df) * len(df.columns)) * 100
        if len(df) > 0 and len(df.columns) > 0 else 0
    )

    findings.append({
        "category": "Data Quality",
        "title": "Missing Data Assessment",
        "description": (
            f"The dataset contains {int(df.isna().sum().sum())} missing "
            f"values, representing {missing_percentage:.2f}% of all cells."
        ),
        "importance": "high" if missing_percentage > 10 else "medium"
    })

    duplicate_count = int(df.duplicated().sum())

    findings.append({
        "category": "Data Quality",
        "title": "Duplicate Records",
        "description": (
            f"{duplicate_count} duplicate rows were detected "
            f"out of {len(df)} total records."
        ),
        "importance": "high" if duplicate_count > 0 else "low"
    })

    for column in numeric_columns[:4]:
        series = df[column].dropna()

        if len(series) == 0:
            continue

        findings.append({
            "category": "Numerical Analysis",
            "title": f"{column} Overview",
            "description": (
                f"{column} has an average of {series.mean():.2f}, "
                f"a minimum of {series.min():.2f}, "
                f"and a maximum of {series.max():.2f}."
            ),
            "importance": "medium"
        })

    for column in categorical_columns[:3]:
        counts = df[column].value_counts(dropna=True)

        if len(counts) == 0:
            continue

        top_category = str(counts.index[0])
        percentage = counts.iloc[0] / len(df) * 100

        findings.append({
            "category": "Category Analysis",
            "title": f"Leading {column}",
            "description": (
                f"{top_category} is the most frequent value in {column}, "
                f"appearing in {int(counts.iloc[0])} records "
                f"({percentage:.2f}% of all rows)."
            ),
            "importance": "medium"
        })

    return findings[:12]


def generate_recommendations(df, numeric_columns, categorical_columns):
    """Create practical recommendations based on measured data quality."""

    recommendations = []

    missing_count = int(df.isna().sum().sum())
    duplicate_count = int(df.duplicated().sum())

    if missing_count > 0:
        recommendations.append({
            "title": "Review Missing Values",
            "description": (
                f"Investigate the {missing_count} missing cells. "
                "Choose an appropriate imputation or removal strategy "
                "before using the affected columns."
            ),
            "priority": "High" if missing_count > len(df) else "Medium"
        })

    if duplicate_count > 0:
        recommendations.append({
            "title": "Review Duplicate Records",
            "description": (
                f"Check the {duplicate_count} duplicate rows and decide "
                "whether they represent repeated events or unwanted records."
            ),
            "priority": "Medium"
        })

    if numeric_columns:
        recommendations.append({
            "title": "Explore Numerical Relationships",
            "description": (
                "Compare numerical columns using correlation analysis "
                "and visualizations to identify potentially related variables."
            ),
            "priority": "Medium"
        })

    if categorical_columns:
        recommendations.append({
            "title": "Compare Categories",
            "description": (
                "Analyze category frequencies and compare numerical "
                "measurements across groups to identify differences."
            ),
            "priority": "Medium"
        })

    if not recommendations:
        recommendations.append({
            "title": "Continue Deeper Analysis",
            "description": (
                "The initial checks did not identify missing values or "
                "duplicate rows. Explore trends, distributions and "
                "relationships to uncover further insights."
            ),
            "priority": "Low"
        })

    return recommendations


def generate_ai_report(df, report_title="Data Analysis Report",
                       report_type="business"):
    """
    Generate a structured, calculation-based report.

    This initial engine uses deterministic statistical analysis.
    It does not call an external generative AI model.
    """

    if df is None or df.empty:
        raise ValueError("The selected dataset is empty.")

    if len(df.columns) == 0:
        raise ValueError("The selected dataset has no columns.")

    numeric_columns, categorical_columns, date_columns = (
        detect_column_types(df)
    )

    kpis = generate_kpis(
        df,
        numeric_columns,
        categorical_columns
    )

    charts = generate_chart_recommendations(
        df,
        numeric_columns,
        categorical_columns
    )

    findings = generate_findings(
        df,
        numeric_columns,
        categorical_columns
    )

    recommendations = generate_recommendations(
        df,
        numeric_columns,
        categorical_columns
    )

        # Generate intelligent report layout
    report_intelligence = generate_report_intelligence(
        df=df,
        findings=findings,
        recommendations=recommendations,
    )

    # Use semantically recommended KPIs
    kpis = report_intelligence["kpis"]

    return {
        "report_title": report_title,
        "report_type": report_type,
        "generated_at": pd.Timestamp.now().isoformat(),
        "dataset_overview": {
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "numeric_columns": [str(c) for c in numeric_columns],
            "categorical_columns": [str(c) for c in categorical_columns],
            "date_columns": [str(c) for c in date_columns],
            "missing_values": int(df.isna().sum().sum()),
            "duplicate_rows": int(df.duplicated().sum())
        },
                "kpis": kpis,
        "charts": charts,
        "findings": findings,
        "recommendations": recommendations,

        # New Power BI-style report intelligence
        "report_layout": report_intelligence,
        "generation_method": (
            "Automated statistical analysis using Pandas and NumPy. "
            "Findings are based on calculated dataset values."
        )
    }
