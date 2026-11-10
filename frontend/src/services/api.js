
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

const TRAINING_SESSION_KEY = "datastory_latest_training";

// DATASET MANAGEMENT

export const uploadDataset = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post("/datasets/upload", formData);
  return response.data;
};

export const getDatasets = async () => {
  const response = await API.get("/datasets/");
  return response.data;
};

export const getDatasetDetails = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}`
  );
  return response.data;
};

export const deleteDataset = async (datasetId) => {
  const response = await API.delete(
    `/datasets/${encodeURIComponent(datasetId)}`
  );
  return response.data;
};

// DATA ANALYSIS

export const getDatasetAnalysis = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/analysis`
  );
  return response.data;
};

export const getDatasetVisualizations = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/visualizations`
  );
  return response.data;
};

// AI DATA ANALYST

export const askDatasetQuestion = async (datasetId, question) => {
  const response = await API.post(
    `/datasets/${encodeURIComponent(datasetId)}/ask`,
    { question }
  );
  return response.data;
};

export const generateDatasetChart = async (datasetId, question) => {
  const response = await API.post(
    `/datasets/${encodeURIComponent(datasetId)}/generate-chart`,
    { question }
  );
  return response.data;
};

// BUSINESS INSIGHTS

export const getBusinessInsights = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/business-insights`
  );
  return response.data;
};

// MACHINE LEARNING TRAINING

export const trainDatasetModels = async (
  datasetId,
  targetColumn,
  problemType
) => {
  const response = await API.post(
    `/datasets/${encodeURIComponent(datasetId)}/train-models`,
    {
      target_column: targetColumn,
      problem_type: problemType,
    }
  );

  const trainingResults = response.data.training_results;

  if (trainingResults?.training_id) {
    const session = {
      dataset_id: datasetId,
      training_id: trainingResults.training_id,
      target_column: trainingResults.target_column,
      problem_type: trainingResults.problem_type,
      best_model: trainingResults.best_model,
      feature_columns: trainingResults.feature_columns,
      prediction_schema: trainingResults.prediction_schema,
      results: trainingResults.results,
      saved_at: new Date().toISOString(),
    };

    sessionStorage.setItem(
      TRAINING_SESSION_KEY,
      JSON.stringify(session)
    );
  }

  return response.data;
};

// GET LATEST TRAINING SESSION

export const getLatestTrainingSession = () => {
  try {
    const stored = sessionStorage.getItem(TRAINING_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// CLEAR LATEST TRAINING SESSION

export const clearLatestTrainingSession = () => {
  sessionStorage.removeItem(TRAINING_SESSION_KEY);
};

// MACHINE LEARNING PREDICTION

export const predictDatasetValue = async (
  datasetId,
  trainingId,
  modelName,
  inputData
) => {
  const response = await API.post(
    `/datasets/${encodeURIComponent(datasetId)}/predict`,
    {
      training_id: trainingId,
      model_name: modelName,
      input_data: inputData,
    }
  );

  return response.data;
};


// AI REPORT GENERATOR

export const generateAIReport = async (
  datasetId,
  reportTitle,
  reportType
) => {
  const response = await API.post(
    `/datasets/${encodeURIComponent(datasetId)}/generate-ai-report`,
    {
      report_title: reportTitle,
      report_type: reportType,
    }
  );

  return response.data;
};



// REPORTS & EXPORT CENTER

export const downloadPDFReport = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/reports/pdf`,
    {
      responseType: "blob",
    }
  );

  return response.data;
};

export const downloadExcelReport = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/reports/excel`,
    {
      responseType: "blob",
    }
  );

  return response.data;
};

export const downloadCSVExport = async (datasetId) => {
  const response = await API.get(
    `/datasets/${encodeURIComponent(datasetId)}/reports/csv`,
    {
      responseType: "blob",
    }
  );

  return response.data;
};

// DEFAULT API EXPORT

export default API;
