
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from xml.sax.saxutils import escape
import re

import pandas as pd

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)

from openpyxl.styles import Font, PatternFill, Alignment


# =====================================================
# COMMON HELPER FUNCTIONS
# =====================================================

def safe_filename(value: str) -> str:
    """Convert a dataset name into a safe filename."""

    name = Path(str(value)).stem

    name = re.sub(
        r"[^A-Za-z0-9_-]+",
        "_",
        name
    ).strip("_")

    return name[:60] or "dataset"


def create_output_path(
    output_directory: Path,
    dataset_name: str,
    extension: str
) -> Path:
    """Create a unique output file path."""

    output_directory = Path(output_directory)

    output_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = (
        f"{safe_filename(dataset_name)}_"
        f"{uuid4().hex[:8]}.{extension}"
    )

    return output_directory / filename


def safe_text(value) -> str:
    """Convert values into safe text for PDF paragraphs."""

    if value is None:
        return ""

    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass

    return escape(str(value))


# =====================================================
# EXCEL REPORT GENERATION
# =====================================================

def create_excel_report(
    df: pd.DataFrame,
    dataset_name: str,
    dataset_id: str,
    output_directory: Path
) -> Path:

    """
    Generate a professional multi-sheet Excel report.

    Worksheets:
    1. Dataset
    2. Overview
    3. Column Analysis
    4. Statistics
    5. Business Insights
    6. Recommendations
    """

    from app.services.dataset_service import (
        profile_dataset,
        analyze_dataset,
        generate_business_insights
    )

    output_path = create_output_path(
        output_directory,
        dataset_name,
        "xlsx"
    )

    profile = profile_dataset(df)

    analysis = analyze_dataset(df)

    business = generate_business_insights(df)

    try:

        with pd.ExcelWriter(
            output_path,
            engine="openpyxl"
        ) as writer:

            # -----------------------------------------
            # 1. ORIGINAL DATASET
            # -----------------------------------------

            df.to_excel(
                writer,
                sheet_name="Dataset",
                index=False
            )

            # -----------------------------------------
            # 2. OVERVIEW
            # -----------------------------------------

            overview = [
                ["DATASTORY ANALYTICS REPORT", ""],
                ["Dataset Name", dataset_name],
                ["Dataset ID", dataset_id],
                [
                    "Generated At",
                    datetime.now().strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                ],
                ["Total Rows", profile["total_rows"]],
                ["Total Columns", profile["total_columns"]],
                [
                    "Missing Values",
                    profile["total_missing_values"]
                ],
                [
                    "Duplicate Rows",
                    profile["duplicate_rows"]
                ],
                [
                    "Data Quality Score (%)",
                    analysis["data_quality"]["quality_score"]
                ],
                [
                    "Missing Cells (%)",
                    analysis["data_quality"]["missing_percentage"]
                ],
                [
                    "Duplicate Rows (%)",
                    analysis["data_quality"]["duplicate_percentage"]
                ]
            ]

            pd.DataFrame(
                overview,
                columns=["Metric", "Value"]
            ).to_excel(
                writer,
                sheet_name="Overview",
                index=False,
                header=False
            )

            # -----------------------------------------
            # 3. COLUMN ANALYSIS
            # -----------------------------------------

            column_rows = []

            for item in analysis["column_analysis"]:

                column_rows.append({
                    "Column": item["column_name"],
                    "Data Type": item["data_type"],
                    "Valid Values": item["total_values"],
                    "Missing Values": item["missing_values"],
                    "Unique Values": item["unique_values"]
                })

            pd.DataFrame(column_rows).to_excel(
                writer,
                sheet_name="Column Analysis",
                index=False
            )

            # -----------------------------------------
            # 4. STATISTICAL SUMMARY
            # -----------------------------------------

            statistics_rows = []

            for column, metrics in (
                analysis["statistical_summary"].items()
            ):

                for metric, value in metrics.items():

                    statistics_rows.append({
                        "Column": column,
                        "Statistic": metric,
                        "Value": value
                    })

            pd.DataFrame(
                statistics_rows,
                columns=["Column", "Statistic", "Value"]
            ).to_excel(
                writer,
                sheet_name="Statistics",
                index=False
            )

            # -----------------------------------------
            # 5. BUSINESS INSIGHTS
            # -----------------------------------------

            insight_rows = []

            for item in business["insights"]:

                insight_rows.append({
                    "Category": item.get("category", ""),
                    "Title": item.get("title", ""),
                    "Description": item.get("description", ""),
                    "Importance": item.get("importance", ""),
                    "Column": item.get("column", "")
                })

            pd.DataFrame(insight_rows).to_excel(
                writer,
                sheet_name="Business Insights",
                index=False
            )

            # -----------------------------------------
            # 6. RECOMMENDATIONS
            # -----------------------------------------

            recommendation_rows = []

            for item in business["recommendations"]:

                recommendation_rows.append({
                    "Recommendation": item.get("title", ""),
                    "Details": item.get("description", "")
                })

            pd.DataFrame(recommendation_rows).to_excel(
                writer,
                sheet_name="Recommendations",
                index=False
            )

            # -----------------------------------------
            # EXCEL FORMATTING
            # -----------------------------------------

            workbook = writer.book

            header_fill = PatternFill(
                fill_type="solid",
                fgColor="24243A"
            )

            header_font = Font(
                bold=True,
                color="FFFFFF"
            )

            for worksheet in workbook.worksheets:

                worksheet.freeze_panes = "A2"

                if worksheet.max_row > 1:
                    worksheet.auto_filter.ref = (
                        worksheet.dimensions
                    )

                for cell in worksheet[1]:

                    cell.fill = header_fill

                    cell.font = header_font

                    cell.alignment = Alignment(
                        vertical="center",
                        wrap_text=True
                    )

                # Automatically adjust column widths.
                for column_cells in worksheet.columns:

                    max_length = 0

                    column_letter = (
                        column_cells[0].column_letter
                    )

                    for cell in column_cells[:200]:

                        try:

                            cell_length = len(
                                str(cell.value or "")
                            )

                            max_length = max(
                                max_length,
                                cell_length
                            )

                        except Exception:
                            pass

                    worksheet.column_dimensions[
                        column_letter
                    ].width = min(
                        max(max_length + 2, 12),
                        45
                    )

    except Exception:

        output_path.unlink(missing_ok=True)

        raise

    return output_path


# =====================================================
# CSV EXPORT
# =====================================================

def create_csv_export(
    df: pd.DataFrame,
    dataset_name: str,
    output_directory: Path
) -> Path:

    """
    Export the original dataset as a downloadable CSV.
    """

    output_path = create_output_path(
        output_directory,
        dataset_name,
        "csv"
    )

    df.to_csv(
        output_path,
        index=False,
        encoding="utf-8-sig"
    )

    return output_path


# =====================================================
# PDF REPORT GENERATION
# =====================================================

def create_pdf_report(
    df: pd.DataFrame,
    dataset_name: str,
    dataset_id: str,
    output_directory: Path
) -> Path:

    """
    Generate a branded DATASTORY PDF report.

    Includes:
    - Executive summary
    - Dataset overview
    - Data quality score
    - Column profile
    - Statistical summary
    - Business insights
    - Recommendations
    """

    from app.services.dataset_service import (
        profile_dataset,
        analyze_dataset,
        generate_business_insights
    )

    output_path = create_output_path(
        output_directory,
        dataset_name,
        "pdf"
    )

    profile = profile_dataset(df)

    analysis = analyze_dataset(df)

    business = generate_business_insights(df)

    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=17 * mm,
        leftMargin=17 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
        title=f"DATASTORY Report - {dataset_name}",
        author="DATASTORY"
    )

    # -----------------------------------------
    # PDF STYLES
    # -----------------------------------------

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="BrandTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.HexColor("#7653D6"),
            spaceAfter=6
        )
    )

    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=colors.HexColor("#34304F"),
            spaceBefore=14,
            spaceAfter=8
        )
    )

    styles.add(
        ParagraphStyle(
            name="SmallBody",
            parent=styles["BodyText"],
            fontSize=8,
            leading=11
        )
    )

    styles.add(
        ParagraphStyle(
            name="InsightTitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#51428A")
        )
    )

    story = []

    generated_at = datetime.now().strftime(
        "%d %B %Y, %I:%M %p"
    )

    # -----------------------------------------
    # REPORT HEADER
    # -----------------------------------------

    story.append(
        Paragraph(
            "DATASTORY",
            styles["BrandTitle"]
        )
    )

    story.append(
        Paragraph(
            "Automated Data Analysis & Intelligence Report",
            styles["Heading2"]
        )
    )

    story.append(
        Paragraph(
            f"<b>Dataset:</b> {safe_text(dataset_name)}",
            styles["BodyText"]
        )
    )

    story.append(
        Paragraph(
            f"<b>Dataset ID:</b> {safe_text(dataset_id)}",
            styles["SmallBody"]
        )
    )

    story.append(
        Paragraph(
            f"<b>Generated:</b> {generated_at}",
            styles["SmallBody"]
        )
    )

    story.append(Spacer(1, 12))

    # -----------------------------------------
    # EXECUTIVE SUMMARY
    # -----------------------------------------

    story.append(
        Paragraph(
            "Executive Summary",
            styles["SectionHeading"]
        )
    )

    story.append(
        Paragraph(
            safe_text(
                business["executive_summary"]
            ),
            styles["BodyText"]
        )
    )

    story.append(Spacer(1, 12))

    # -----------------------------------------
    # DATASET OVERVIEW TABLE
    # -----------------------------------------

    story.append(
        Paragraph(
            "Dataset Overview",
            styles["SectionHeading"]
        )
    )

    overview_data = [
        ["Metric", "Value"],

        ["Total Rows", f'{profile["total_rows"]:,}'],

        ["Total Columns", str(profile["total_columns"])],

        [
            "Missing Values",
            f'{profile["total_missing_values"]:,}'
        ],

        [
            "Duplicate Rows",
            f'{profile["duplicate_rows"]:,}'
        ],

        [
            "Data Quality Score",
            f'{analysis["data_quality"]["quality_score"]}%'
        ],

        [
            "Missing Cells",
            f'{analysis["data_quality"]["missing_percentage"]}%'
        ]
    ]

    overview_table = Table(
        overview_data,
        colWidths=[75 * mm, 55 * mm]
    )

    overview_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#34304F")
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.4,
                colors.HexColor("#D9D7E3")
            ),
            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor("#F4F2FA")
                ]
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(overview_table)

    # -----------------------------------------
    # COLUMN PROFILE
    # -----------------------------------------

    story.append(
        Paragraph(
            "Column Profile",
            styles["SectionHeading"]
        )
    )

    column_data = [
        [
            "Column",
            "Data Type",
            "Valid",
            "Missing",
            "Unique"
        ]
    ]

    for item in analysis["column_analysis"]:

        column_data.append([
            Paragraph(
                safe_text(item["column_name"]),
                styles["SmallBody"]
            ),

            safe_text(item["data_type"])[:18],

            str(item["total_values"]),

            str(item["missing_values"]),

            str(item["unique_values"])
        ])

    column_table = Table(
        column_data,
        repeatRows=1,
        colWidths=[
            53 * mm,
            30 * mm,
            25 * mm,
            25 * mm,
            25 * mm
        ]
    )

    column_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#34304F")
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.35,
                colors.HexColor("#D9D7E3")
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor("#F4F2FA")
                ]
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                5
            )
        ])
    )

    story.append(column_table)

    # -----------------------------------------
    # STATISTICAL SUMMARY
    # -----------------------------------------

    story.append(PageBreak())

    story.append(
        Paragraph(
            "Statistical Summary",
            styles["SectionHeading"]
        )
    )

    statistics_data = [
        ["Column", "Statistic", "Value"]
    ]

    for column, metrics in (
        analysis["statistical_summary"].items()
    ):

        for metric, value in metrics.items():

            statistics_data.append([
                Paragraph(
                    safe_text(column),
                    styles["SmallBody"]
                ),

                safe_text(metric),

                "" if value is None else safe_text(value)
            ])

    if len(statistics_data) == 1:

        story.append(
            Paragraph(
                "No numerical columns were available "
                "for statistical analysis.",
                styles["BodyText"]
            )
        )

    else:

        statistics_table = Table(
            statistics_data,
            repeatRows=1,
            colWidths=[
                70 * mm,
                55 * mm,
                45 * mm
            ]
        )

        statistics_table.setStyle(
            TableStyle([
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#34304F")
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold"
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.35,
                    colors.HexColor("#D9D7E3")
                ),
                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    8
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor("#F4F2FA")
                    ]
                ),
                (
                    "PADDING",
                    (0, 0),
                    (-1, -1),
                    5
                )
            ])
        )

        story.append(statistics_table)

    # -----------------------------------------
    # BUSINESS INSIGHTS
    # -----------------------------------------

    story.append(
        Paragraph(
            "Business Insights",
            styles["SectionHeading"]
        )
    )

    for item in business["insights"][:60]:

        insight_title = (
            f'{safe_text(item.get("title", "Insight"))} '
            f'— {safe_text(item.get("category", ""))}'
        )

        insight_description = safe_text(
            item.get("description", "")
        )

        insight_block = [

            Paragraph(
                insight_title,
                styles["InsightTitle"]
            ),

            Paragraph(
                insight_description,
                styles["SmallBody"]
            ),

            Spacer(1, 7)

        ]

        story.append(
            KeepTogether(insight_block)
        )

    # -----------------------------------------
    # RECOMMENDATIONS
    # -----------------------------------------

    story.append(
        Paragraph(
            "Recommendations",
            styles["SectionHeading"]
        )
    )

    for item in business["recommendations"]:

        story.append(
            Paragraph(
                safe_text(item.get("title", "")),
                styles["InsightTitle"]
            )
        )

        story.append(
            Paragraph(
                safe_text(item.get("description", "")),
                styles["SmallBody"]
            )
        )

        story.append(Spacer(1, 7))

    # -----------------------------------------
    # PAGE NUMBER AND FOOTER
    # -----------------------------------------

    def add_page_footer(canvas, document):

        canvas.saveState()

        canvas.setFont(
            "Helvetica",
            8
        )

        canvas.setFillColor(
            colors.HexColor("#77738A")
        )

        canvas.drawString(
            17 * mm,
            10 * mm,
            "Generated by DATASTORY"
        )

        canvas.drawRightString(
            A4[0] - 17 * mm,
            10 * mm,
            f"Page {document.page}"
        )

        canvas.restoreState()

    # -----------------------------------------
    # BUILD PDF
    # -----------------------------------------

    try:

        document.build(
            story,
            onFirstPage=add_page_footer,
            onLaterPages=add_page_footer
        )

    except Exception:

        output_path.unlink(missing_ok=True)

        raise

    return output_path
