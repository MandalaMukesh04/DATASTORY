
import re
import pandas as pd
import numpy as np


# ==========================================
# COLUMN MEANING DETECTION
# ==========================================

COLUMN_KEYWORDS = {
    "amount": [
        "amount", "price", "sales", "revenue", "income",
        "cost", "expense", "profit", "balance", "payment",
        "salary", "value", "total"
    ],
    "quantity": [
        "quantity", "qty", "units", "count", "orders",
        "transactions", "visits", "items"
    ],
    "date": [
        "date", "time", "timestamp", "month", "year",
        "day", "created", "updated"
    ],
    "customer": [
        "customer", "client", "user", "buyer", "subscriber"
    ],
    "product": [
        "product", "item", "category", "brand", "service"
    ],
    "location": [
        "city", "state", "country", "region", "location",
        "area", "branch", "outlet"
    ],
    "status": [
        "status", "type", "category", "segment", "channel",
        "method", "mode", "class"
    ],
    "fraud": [
        "fraud", "is_fraud", "fraudulent", "suspicious",
        "risk", "anomaly"
    ],
}


def normalize_column_name(column):
    return re.sub(
        r"[^a-z0-9]+",
        "_",
        str(column).strip().lower()
    ).strip("_")


def identify_column_role(column, series):
    """
    Identify a likely business meaning for a column.
    This is a heuristic, not a guaranteed semantic classification.
    """

    name = normalize_column_name(column)

    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"

    for role, keywords in COLUMN_KEYWORDS.items():
        for keyword in keywords:
            if name == keyword or keyword in name.split("_"):
                return role

    if pd.api.types.is_numeric_dtype(series):
        return "measure"

    if series.nunique(dropna=True) <= 50:
        return "dimension"

    return "text"


def analyze_column_roles(df):
    roles = {}

    for column in df.columns:
        roles[str(column)] = identify_column_role(
            column,
            df[column]
        )

    return roles


# ==========================================
# DATE COLUMN DETECTION
# ==========================================

def detect_date_columns(df):
    date_columns = []

    for column in df.columns:
        series = df[column]

        if pd.api.types.is_datetime64_any_dtype(series):
            date_columns.append(str(column))
            continue

        if pd.api.types.is_numeric_dtype(series):
            continue

        try:
            converted = pd.to_datetime(
                series,
                errors="coerce"
            )

            valid_ratio = converted.notna().mean()

            if valid_ratio >= 0.8:
                date_columns.append(str(column))

        except Exception:
            continue

    return date_columns


# ==========================================
# KPI RECOMMENDATION ENGINE
# ==========================================

def create_recommended_kpis(df, column_roles):
    kpis = []

    # Basic dataset KPIs
    kpis.append({
        "id": "total_records",
        "title": "Total Records",
        "value": int(len(df)),
        "format": "number",
        "source_column": None,
        "calculation": "row_count",
        "description": "Total records available in the dataset."
    })

    kpis.append({
        "id": "total_columns",
        "title": "Total Columns",
        "value": int(len(df.columns)),
        "format": "number",
        "source_column": None,
        "calculation": "column_count",
        "description": "Total fields available in the dataset."
    })

    # Meaningful numerical KPIs
    measure_columns = [
        column
        for column, role in column_roles.items()
        if role in ["amount", "quantity", "measure"]
        and pd.api.types.is_numeric_dtype(df[column])
    ]

    amount_columns = [
        column
        for column, role in column_roles.items()
        if role == "amount"
        and pd.api.types.is_numeric_dtype(df[column])
    ]

    # Prefer amount-related columns over arbitrary numeric columns.
    preferred_columns = amount_columns + [
        column
        for column in measure_columns
        if column not in amount_columns
    ]

    for column in preferred_columns[:3]:
        values = df[column].dropna()

        if values.empty:
            continue

        role = column_roles[column]

        if role == "amount":
            kpis.append({
                "id": f"total_{normalize_column_name(column)}",
                "title": f"Total {column}",
                "value": float(values.sum()),
                "format": "number",
                "source_column": column,
                "calculation": "sum",
                "description": f"Sum of all available {column} values."
            })

        kpis.append({
            "id": f"average_{normalize_column_name(column)}",
            "title": f"Average {column}",
            "value": float(values.mean()),
            "format": "number",
            "source_column": column,
            "calculation": "average",
            "description": f"Average value of {column}."
        })

    # Category KPIs
    for column, role in column_roles.items():
        if role in ["dimension", "status", "customer", "product", "location"]:
            unique_count = int(df[column].nunique(dropna=True))

            if unique_count > 0:
                kpis.append({
                    "id": f"unique_{normalize_column_name(column)}",
                    "title": f"Unique {column}",
                    "value": unique_count,
                    "format": "number",
                    "source_column": column,
                    "calculation": "unique_count",
                    "description": f"Number of distinct {column} values."
                })

            break

    return kpis[:7]


# ==========================================
# CHART RECOMMENDATION ENGINE
# ==========================================

def create_recommended_visuals(df, column_roles):
    visuals = []

    categorical_columns = [
        column
        for column, role in column_roles.items()
        if role in [
            "dimension", "status", "customer",
            "product", "location", "fraud"
        ]
        and 1 < df[column].nunique(dropna=True) <= 50
    ]

    numerical_columns = [
        column
        for column in df.columns
        if pd.api.types.is_numeric_dtype(df[column])
        and df[column].nunique(dropna=True) > 1
    ]

    date_columns = detect_date_columns(df)

    # Category distribution
    if categorical_columns:
        category = categorical_columns[0]

        counts = (
            df[category]
            .fillna("Missing")
            .astype(str)
            .value_counts()
            .head(10)
        )

        visuals.append({
            "id": "category_distribution",
            "title": f"{category} Distribution",
            "visual_type": "donut",
            "category_column": category,
            "value_column": None,
            "data": [
                {
                    "label": str(label),
                    "value": int(value)
                }
                for label, value in counts.items()
            ]
        })

    # Numerical comparison by category
    if categorical_columns and numerical_columns:
        category = categorical_columns[0]

        # Prefer amount columns if available.
        amount_candidates = [
            column
            for column, role in column_roles.items()
            if role == "amount"
            and column in numerical_columns
        ]

        measure = (
            amount_candidates[0]
            if amount_candidates
            else numerical_columns[0]
        )

        grouped = (
            df.groupby(category, dropna=False)[measure]
            .sum()
            .sort_values(ascending=False)
            .head(10)
        )

        visuals.append({
            "id": "category_comparison",
            "title": f"{measure} by {category}",
            "visual_type": "bar",
            "category_column": category,
            "value_column": measure,
            "data": [
                {
                    "label": str(label),
                    "value": float(value)
                }
                for label, value in grouped.items()
            ]
        })

    # Numerical distributions
    for column in numerical_columns[:2]:
        visuals.append({
            "id": f"distribution_{normalize_column_name(column)}",
            "title": f"{column} Distribution",
            "visual_type": "histogram",
            "category_column": None,
            "value_column": column,
            "data": [
                float(value)
                for value in df[column].dropna().head(1000).tolist()
            ]
        })

    # Time-based trends
    if date_columns and numerical_columns:
        date_column = date_columns[0]
        measure = numerical_columns[0]

        try:
            temp = df[[date_column, measure]].copy()

            temp[date_column] = pd.to_datetime(
                temp[date_column],
                errors="coerce"
            )

            temp = temp.dropna()

            if not temp.empty:
                temp["period"] = (
                    temp[date_column]
                    .dt.to_period("M")
                    .astype(str)
                )

                grouped = (
                    temp.groupby("period")[measure]
                    .sum()
                    .sort_index()
                    .tail(24)
                )

                visuals.append({
                    "id": "time_trend",
                    "title": f"{measure} Trend Over Time",
                    "visual_type": "line",
                    "category_column": date_column,
                    "value_column": measure,
                    "data": [
                        {
                            "label": str(label),
                            "value": float(value)
                        }
                        for label, value in grouped.items()
                    ]
                })

        except Exception:
            pass

    # Numerical correlation
    if len(numerical_columns) >= 2:
        correlation = df[numerical_columns].corr(
            numeric_only=True
        )

        visuals.append({
            "id": "correlation_analysis",
            "title": "Numerical Relationship Analysis",
            "visual_type": "correlation",
            "columns": [str(c) for c in correlation.columns],
            "data": [
                {
                    "column": str(column),
                    "values": [
                        None if pd.isna(value) else float(value)
                        for value in correlation[column].tolist()
                    ]
                }
                for column in correlation.columns
            ]
        })

    return visuals[:7]


# ==========================================
# REPORT PAGE LAYOUT
# ==========================================

def create_report_pages(kpis, visuals, findings, recommendations):
    """
    Build a suggested multi-page report structure.
    """

    return [
        {
            "page_id": "executive_overview",
            "title": "Executive Overview",
            "description": "A high-level summary of the dataset.",
            "sections": [
                {
                    "section_id": "overview_kpis",
                    "title": "Key Performance Indicators",
                    "component_type": "kpi_row",
                    "items": [
                        item["id"] for item in kpis[:6]
                    ]
                },
                {
                    "section_id": "overview_visuals",
                    "title": "Performance Analysis",
                    "component_type": "chart_grid",
                    "items": [
                        item["id"] for item in visuals[:4]
                    ]
                }
            ]
        },
        {
            "page_id": "detailed_analysis",
            "title": "Detailed Analysis",
            "description": "Detailed charts and data relationships.",
            "sections": [
                {
                    "section_id": "detailed_visuals",
                    "title": "Detailed Visualizations",
                    "component_type": "chart_grid",
                    "items": [
                        item["id"] for item in visuals
                    ]
                }
            ]
        },
        {
            "page_id": "insights",
            "title": "Insights & Recommendations",
            "description": "Important findings and recommended actions.",
            "sections": [
                {
                    "section_id": "findings",
                    "title": "Key Findings",
                    "component_type": "insight_cards",
                    "items": [
                        str(index)
                        for index in range(len(findings))
                    ]
                },
                {
                    "section_id": "recommendations",
                    "title": "Recommendations",
                    "component_type": "recommendation_list",
                    "items": [
                        str(index)
                        for index in range(len(recommendations))
                    ]
                }
            ]
        }
    ]


# ==========================================
# COMPLETE REPORT INTELLIGENCE
# ==========================================

def generate_report_intelligence(
    df,
    findings=None,
    recommendations=None
):
    if df is None or df.empty:
        raise ValueError("Cannot create a report from an empty dataset.")

    findings = findings or []
    recommendations = recommendations or []

    column_roles = analyze_column_roles(df)

    kpis = create_recommended_kpis(
        df,
        column_roles
    )

    visuals = create_recommended_visuals(
        df,
        column_roles
    )

    pages = create_report_pages(
        kpis,
        visuals,
        findings,
        recommendations
    )

    return {
        "theme": "powerbi_light",
        "layout_type": "executive_dashboard",
        "column_roles": column_roles,
        "kpis": kpis,
        "visuals": visuals,
        "pages": pages,
        "page_count": len(pages),
        "analysis_note": (
            "Column roles and chart recommendations are heuristic. "
            "Review the detected meanings before relying on them."
        )
    }
