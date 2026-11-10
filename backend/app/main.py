from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.api.dataset_routes import router as dataset_router

# Initialize DATASTORY application
app = FastAPI(
    title="DATASTORY API",
    description="AI-Powered Automated Data Analysis and Intelligence Platform",
    version="1.1.0"
)

# Allow communication with our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DATASTORY",
        "description": "AI-Powered Data Intelligence Platform",
        "status": "Running Successfully"
    }


@app.get("/api/health")
def health_check():
    return {
        "application": "DATASTORY",
        "status": "Healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/info")
def project_info():
    return {
        "project_name": "DATASTORY",
        "version": "1.1.0",
        "technology": [
            "Python",
            "FastAPI",
            "Pandas",
            "NumPy",
            "Scikit-learn",
            "ReportLab",
            "OpenPyXL",
            "React"
        ],
        "purpose": "Automated Data Analysis and Intelligence"
    }
