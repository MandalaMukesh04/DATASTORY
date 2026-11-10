
import uuid
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from app.services.ai_analyst_service import answer_dataset_question
from app.services.ai_chart_service import generate_ai_chart
from app.services.ai_report_service import generate_ai_report

from app.services.dataset_service import (
    load_dataset,
    profile_dataset,
    get_dataset_preview,
    analyze_dataset,
    generate_visualization_data,
    generate_business_insights,
)

from app.services.reports_service import (
    create_pdf_report,
    create_excel_report,
    create_csv_export,
)

from app.ml.training_service import (
    train_models,
    predict_trained_model,
)


# ==========================================
# ROUTER CONFIGURATION
# ==========================================

router = APIRouter(
    prefix="/api/datasets",
    tags=["Dataset Management"],
)

UPLOAD_DIRECTORY = Path("uploaded_datasets")
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)

REPORT_DIRECTORY = Path("generated_reports")
REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".json"]


# ==========================================
# REQUEST MODELS
# ==========================================

class MLTrainingRequest(BaseModel):
    target_column: str
    problem_type: str


class MLPredictionRequest(BaseModel):
    training_id: str
    model_name: str
    input_data: dict[str, Any]


class AnalystQuestion(BaseModel):
    question: str


class AIChartQuestion(BaseModel):
    question: str


class AIReportRequest(BaseModel):
    report_title: str = "Data Analysis Report"
    report_type: str = "business"


# ==========================================
# DATASET FILENAME MANAGEMENT
# ==========================================

def get_dataset_metadata_path(file_path: Path) -> Path:
    return file_path.with_suffix(file_path.suffix + ".meta")


def get_original_filename(file_path: Path) -> str:
    """
    Read the original uploaded filename from metadata.

    If an older dataset has a UUID saved as its filename,
    return a readable fallback instead of displaying the UUID.
    """

    metadata_path = get_dataset_metadata_path(file_path)

    if metadata_path.exists():
        try:
            original_filename = metadata_path.read_text(
                encoding="utf-8"
            ).strip()

            if original_filename:
                # Avoid displaying a UUID as the filename
                # when older metadata contains the storage ID.
                try:
                    uuid.UUID(Path(original_filename).stem)

                    if Path(original_filename).stem == file_path.stem:
                        return f"Dataset {file_path.stem[:8]}"

                except ValueError:
                    pass

                return Path(original_filename).name

        except OSError:
            pass

    # Fallback for datasets without metadata.
    try:
        uuid.UUID(file_path.stem)
        return f"Dataset {file_path.stem[:8]}"
    except ValueError:
        return file_path.name


# ==========================================
# SHARED DATASET VALIDATION
# ==========================================

def get_dataset_file_path(dataset_id: str):

    if Path(dataset_id).name != dataset_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid dataset ID.",
        )

    file_path = UPLOAD_DIRECTORY / dataset_id

    if (
        not file_path.is_file()
        or file_path.suffix.lower() not in SUPPORTED_EXTENSIONS
    ):
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    return file_path


# ==========================================
# 1. UPLOAD DATASET
# ==========================================

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a file.",
        )

    # Preserve the original filename without any directory path.
    original_filename = Path(file.filename).name

    extension = Path(original_filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format.",
        )

    unique_filename = str(uuid.uuid4()) + extension

    file_path = UPLOAD_DIRECTORY / unique_filename
    metadata_path = get_dataset_metadata_path(file_path)

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File size must not exceed 20 MB.",
            )

        file_path.write_bytes(content)

        # Validate uploaded dataset.
        df = load_dataset(str(file_path))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset has no rows.",
            )

        profile = profile_dataset(df)
        preview = get_dataset_preview(df)

        # Save the actual original filename.
        metadata_path.write_text(
            original_filename,
            encoding="utf-8",
        )

        return {
            "message": "Dataset uploaded successfully.",
            "filename": original_filename,
            "dataset_id": unique_filename,
            "profile": profile,
            "preview": preview,
        }

    except HTTPException:
        file_path.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)
        raise

    except Exception as error:
        file_path.unlink(missing_ok=True)
        metadata_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=f"Unable to process dataset: {str(error)}",
        )


# ==========================================
# 2. LIST ALL DATASETS
# ==========================================

@router.get("/")
def get_all_datasets():

    datasets = []

    for file_path in UPLOAD_DIRECTORY.iterdir():

        if not file_path.is_file():
            continue

        if file_path.name.endswith(".meta"):
            continue

        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        original_filename = get_original_filename(file_path)

        try:
            df = load_dataset(str(file_path))
            profile = profile_dataset(df)

            datasets.append({
                "dataset_id": file_path.name,
                "filename": original_filename,
                "file_type": file_path.suffix.upper().replace(".", ""),
                "total_rows": profile["total_rows"],
                "total_columns": profile["total_columns"],
                "missing_values": profile["total_missing_values"],
                "duplicate_rows": profile["duplicate_rows"],
                "file_size": round(
                    file_path.stat().st_size / 1024,
                    2,
                ),
                "uploaded_at": file_path.stat().st_mtime,
            })

        except Exception:
            continue

    datasets.sort(
        key=lambda item: item["uploaded_at"],
        reverse=True,
    )

    return {
        "total_datasets": len(datasets),
        "datasets": datasets,
    }


# ==========================================
# 3. GET ONE DATASET
# ==========================================

@router.get("/{dataset_id}")
def get_dataset(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))

        return {
            "dataset_id": dataset_id,
            "filename": get_original_filename(file_path),
            "profile": profile_dataset(df),
            "preview": get_dataset_preview(df, limit=20),
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read dataset: {str(error)}",
        )


# ==========================================
# 4. DELETE DATASET
# ==========================================

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    file_path.unlink(missing_ok=True)

    metadata_path = get_dataset_metadata_path(file_path)
    metadata_path.unlink(missing_ok=True)

    return {
        "message": "Dataset deleted successfully.",
        "dataset_id": dataset_id,
    }


# ==========================================
# 5. DATASET ANALYSIS
# ==========================================

@router.get("/{dataset_id}/analysis")
def get_dataset_analysis(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        analysis = analyze_dataset(df)

        return {
            "dataset_id": dataset_id,
            "analysis": analysis,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to analyze dataset: {str(error)}",
        )


# ==========================================
# 6. DATASET VISUALIZATIONS
# ==========================================

@router.get("/{dataset_id}/visualizations")
def get_dataset_visualizations(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        visualization_data = generate_visualization_data(df)

        return {
            "dataset_id": dataset_id,
            "visualizations": visualization_data,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to generate visualization data: {str(error)}",
        )


# ==========================================
# 7. AI DATA ANALYST
# ==========================================

@router.post("/{dataset_id}/ask")
def ask_dataset_question(
    dataset_id: str,
    payload: AnalystQuestion,
):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))

        response = answer_dataset_question(
            df,
            payload.question,
        )

        return {
            "dataset_id": dataset_id,
            "question": payload.question,
            "response": response,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to answer question: {str(error)}",
        )


# ==========================================
# 8. AI CHART GENERATION
# ==========================================

@router.post("/{dataset_id}/generate-chart")
def generate_dataset_chart(
    dataset_id: str,
    payload: AIChartQuestion,
):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))

        result = generate_ai_chart(
            df,
            payload.question,
        )

        return {
            "dataset_id": dataset_id,
            "question": payload.question,
            "response": result,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to generate chart: {str(error)}",
        )


# ==========================================
# 9. BUSINESS INSIGHTS
# ==========================================

@router.get("/{dataset_id}/business-insights")
def get_business_insights(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        insights = generate_business_insights(df)

        return {
            "dataset_id": dataset_id,
            "business_insights": insights,
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to generate business insights: {str(error)}",
        )


# ==========================================
# 10. MACHINE LEARNING MODEL TRAINING
# ==========================================

@router.post("/{dataset_id}/train-models")
def train_dataset_models(
    dataset_id: str,
    payload: MLTrainingRequest,
):

    file_path = get_dataset_file_path(dataset_id)

    if payload.problem_type not in [
        "classification",
        "regression",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Problem type must be classification or regression.",
        )

    try:
        df = load_dataset(str(file_path))

        results = train_models(
            df=df,
            target_column=payload.target_column,
            problem_type=payload.problem_type,
            dataset_id=dataset_id,
        )

        return {
            "message": "Machine learning training completed.",
            "dataset_id": dataset_id,
            "training_results": results,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Model training failed: {str(error)}",
        )


# ==========================================
# 11. MACHINE LEARNING PREDICTION
# ==========================================

@router.post("/{dataset_id}/predict")
def predict_dataset_value(
    dataset_id: str,
    payload: MLPredictionRequest,
):

    get_dataset_file_path(dataset_id)

    try:
        from app.ml.training_service import TRAINED_MODEL_REGISTRY

        session = TRAINED_MODEL_REGISTRY.get(
            payload.training_id
        )

        if session is None:
            raise ValueError(
                "Training session not found. Please train the models again."
            )

        if session["dataset_id"] != dataset_id:
            raise ValueError(
                "This training session does not belong to the selected dataset."
            )

        result = predict_trained_model(
            training_id=payload.training_id,
            model_name=payload.model_name,
            input_data=payload.input_data,
        )

        return {
            "message": "Prediction generated successfully.",
            "dataset_id": dataset_id,
            "prediction_result": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )


# ==========================================
# 12. DOWNLOAD PDF REPORT
# ==========================================

@router.get("/{dataset_id}/reports/pdf")
def download_pdf_report(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        original_filename = get_original_filename(file_path)

        report_path = create_pdf_report(
            df=df,
            dataset_name=original_filename,
            dataset_id=dataset_id,
            output_directory=REPORT_DIRECTORY,
        )

        return FileResponse(
            path=str(report_path),
            media_type="application/pdf",
            filename=(
                f"DATASTORY_Report_"
                f"{Path(original_filename).stem}.pdf"
            ),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate PDF report: {str(error)}",
        )


# ==========================================
# 13. DOWNLOAD EXCEL REPORT
# ==========================================

@router.get("/{dataset_id}/reports/excel")
def download_excel_report(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        original_filename = get_original_filename(file_path)

        report_path = create_excel_report(
            df=df,
            dataset_name=original_filename,
            dataset_id=dataset_id,
            output_directory=REPORT_DIRECTORY,
        )

        return FileResponse(
            path=str(report_path),
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            filename=(
                f"DATASTORY_Report_"
                f"{Path(original_filename).stem}.xlsx"
            ),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate Excel report: {str(error)}",
        )


# ==========================================
# 14. DOWNLOAD RAW DATA AS CSV
# ==========================================

@router.get("/{dataset_id}/reports/csv")
def download_dataset_csv(dataset_id: str):

    file_path = get_dataset_file_path(dataset_id)

    try:
        df = load_dataset(str(file_path))
        original_filename = get_original_filename(file_path)

        report_path = create_csv_export(
            df=df,
            dataset_name=original_filename,
            output_directory=REPORT_DIRECTORY,
        )

        return FileResponse(
            path=str(report_path),
            media_type="text/csv",
            filename=(
                f"DATASTORY_Data_"
                f"{Path(original_filename).stem}.csv"
            ),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to export CSV: {str(error)}",
        )



# ==========================================
# 15. AI REPORT GENERATION
# ==========================================

@router.post("/{dataset_id}/generate-ai-report")
def generate_dataset_ai_report(
    dataset_id: str,
    payload: AIReportRequest,
):

    file_path = get_dataset_file_path(dataset_id)

    try:
        # Load selected dataset
        df = load_dataset(str(file_path))

        # Get original uploaded filename
        original_filename = get_original_filename(file_path)

        # Generate report using calculated dataset statistics
        report = generate_ai_report(
            df=df,
            report_title=payload.report_title,
            report_type=payload.report_type,
        )

        return {
            "message": "AI report generated successfully.",
            "dataset_id": dataset_id,
            "dataset_name": original_filename,
            "report": report,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate AI report: {str(error)}",
        )
