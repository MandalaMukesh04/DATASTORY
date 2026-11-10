
import { useEffect, useState } from "react";

import {
  getDatasets,
  getDatasetVisualizations,
  trainDatasetModels,
} from "../services/api";

import {
  BrainCircuit,
  Database,
  Play,
  RefreshCw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Target,
  Layers3,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

import "./MachineLearning.css";


function MachineLearning() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [columns, setColumns] = useState([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [problemType, setProblemType] = useState("classification");

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [training, setTraining] = useState(false);

  const [results, setResults] = useState(null);
  const [error, setError] = useState("");


  // ==========================================
  // LOAD UPLOADED DATASETS
  // ==========================================

  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      setError("");

      const response = await getDatasets();
      const available = response.datasets || [];

      setDatasets(available);

      if (available.length > 0) {
        setSelectedId((previous) =>
          available.some((item) => item.dataset_id === previous)
            ? previous
            : available[0].dataset_id
        );
      } else {
        setSelectedId("");
        setColumns([]);
        setResults(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your datasets."
      );
    } finally {
      setLoadingDatasets(false);
    }
  };


  // ==========================================
  // LOAD DATASET COLUMNS
  // ==========================================

  const loadColumns = async (datasetId) => {
    if (!datasetId) return;

    try {
      setLoadingColumns(true);
      setError("");
      setResults(null);
      setColumns([]);
      setTargetColumn("");

      const response = await getDatasetVisualizations(datasetId);
      const data = response.visualizations;

      const numeric = data.numeric_columns || [];
      const categorical = data.categorical_columns || [];

      const allColumns = [
        ...new Set([...numeric, ...categorical])
      ];

      setColumns(allColumns);

      if (allColumns.length > 0) {
        setTargetColumn(allColumns[allColumns.length - 1]);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load dataset columns."
      );
    } finally {
      setLoadingColumns(false);
    }
  };


  // ==========================================
  // INITIAL DATA LOADING
  // ==========================================

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadColumns(selectedId);
    }
  }, [selectedId]);


  // ==========================================
  // SELECTED DATASET
  // ==========================================

  const selectedDataset = datasets.find(
    (item) => item.dataset_id === selectedId
  );


  // ==========================================
  // TARGET COLUMN CHANGE
  // ==========================================

  const handleTargetChange = (column) => {
    setTargetColumn(column);
    setResults(null);

    if (columns.includes(column)) {
      setProblemType("classification");
    }
  };


  // ==========================================
  // TRAIN MACHINE LEARNING MODELS
  // ==========================================

  const handleTraining = async () => {
    if (!selectedId || !targetColumn) {
      setError("Please select a dataset and target column.");
      return;
    }

    try {
      setTraining(true);
      setError("");
      setResults(null);

      const response = await trainDatasetModels(
        selectedId,
        targetColumn,
        problemType
      );

      setResults(response.training_results);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Model training failed. Please check your dataset."
      );
    } finally {
      setTraining(false);
    }
  };


  // ==========================================
  // SUCCESSFUL MODEL RESULTS
  // ==========================================

  const successfulResults = results
    ? results.results.filter(
        (result) => result.status === "success"
      )
    : [];


  // ==========================================
  // MODEL COMPARISON CHART DATA
  // ==========================================

  const modelComparisonData =
    results?.problem_type === "classification"
      ? successfulResults.map((result) => ({
          model: result.model,

          Accuracy: Number(
            (result.metrics.accuracy * 100).toFixed(2)
          ),

          Precision: Number(
            (result.metrics.precision * 100).toFixed(2)
          ),

          Recall: Number(
            (result.metrics.recall * 100).toFixed(2)
          ),

          "F1 Score": Number(
            (result.metrics.f1_score * 100).toFixed(2)
          ),
        }))
      : [];


  // ==========================================
  // BEST MODEL DETAILS
  // ==========================================

  const bestResult = results
    ? successfulResults.find(
        (result) => result.model === results.best_model
      )
    : null;

  const bestMetrics = bestResult?.metrics;

  const bestFeatureImportance =
    bestResult?.feature_importance || [];

  const featureImportanceData = bestFeatureImportance.map(
    (item) => ({
      feature: item.feature,
      importance: item.importance,
      importance_std: item.importance_std,
    })
  );

  const matrix = bestMetrics?.confusion_matrix || [];

  const classLabels = bestMetrics?.class_labels || [];


  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loadingDatasets) {
    return (
      <div className="ml-loading">
        <LoaderCircle size={30} className="ml-spin" />
        <p>Loading your datasets...</p>
      </div>
    );
  }


  return (
    <div className="ml-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="ml-header">
        <div>
          <span className="ml-eyebrow">
            DATASTORY INTELLIGENCE
          </span>

          <h1>Machine Learning Lab</h1>

          <p>
            Train, evaluate and compare machine learning models
            using your uploaded datasets.
          </p>
        </div>

        <div className="ml-header-icon">
          <BrainCircuit size={30} />
        </div>
      </div>


      {/* ==================================
          TRAINING CONFIGURATION
      ================================== */}

      <div className="ml-config-card">

        <div className="ml-section-title">
          <div className="ml-title-icon">
            <Layers3 size={20} />
          </div>

          <div>
            <h2>Training Configuration</h2>
            <p>Configure your machine learning experiment.</p>
          </div>
        </div>

        <div className="ml-form-grid">

          <div className="ml-field">
            <label>Select Dataset</label>

            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {datasets.length === 0 && (
                <option value="">No datasets available</option>
              )}

              {datasets.map((dataset) => (
                <option
                  key={dataset.dataset_id}
                  value={dataset.dataset_id}
                >
                  {dataset.filename}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-field">
            <label>Target Column</label>

            <select
              value={targetColumn}
              onChange={(event) =>
                handleTargetChange(event.target.value)
              }
              disabled={loadingColumns || columns.length === 0}
            >
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-field">
            <label>Machine Learning Problem</label>

            <select
              value={problemType}
              onChange={(event) => {
                setProblemType(event.target.value);
                setResults(null);
              }}
            >
              <option value="classification">
                Classification
              </option>

              <option value="regression">
                Regression
              </option>
            </select>
          </div>

        </div>

        {selectedDataset && (
          <div className="ml-dataset-info">
            <Database size={18} />

            <span>
              <strong>{selectedDataset.filename}</strong>
              {" · "}
              {selectedDataset.total_rows} records
              {" · "}
              {selectedDataset.total_columns} columns
            </span>
          </div>
        )}

        <button
          className="ml-train-button"
          onClick={handleTraining}
          disabled={
            training ||
            loadingColumns ||
            !selectedId ||
            !targetColumn ||
            datasets.length === 0
          }
        >
          {training ? (
            <>
              <LoaderCircle size={18} className="ml-spin" />
              Training Models...
            </>
          ) : (
            <>
              <Play size={18} />
              Train & Compare Models
            </>
          )}
        </button>

      </div>


      {/* ==================================
          ERROR MESSAGE
      ================================== */}

      {error && (
        <div className="ml-error">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}


      {/* ==================================
          NO DATASETS
      ================================== */}

      {datasets.length === 0 && (
        <div className="ml-empty">
          <Database size={42} />
          <h2>No datasets found</h2>
          <p>Upload a dataset before starting model training.</p>
        </div>
      )}


      {/* ==================================
          TRAINING RESULTS
      ================================== */}

      {results && (
        <div className="ml-results">

          {/* RESULTS HEADER */}

          <div className="ml-results-heading">
            <div>
              <span className="ml-eyebrow">
                EXPERIMENT RESULTS
              </span>

              <h2>Model Performance</h2>

              <p>
                Evaluation on held-out test data.
              </p>
            </div>

            <button
              className="ml-refresh-button"
              onClick={handleTraining}
              disabled={training}
            >
              <RefreshCw size={16} />
              Run Again
            </button>
          </div>


          {/* SUMMARY CARDS */}

          <div className="ml-summary-grid">

            <div className="ml-summary-card">
              <Database size={20} />
              <span>Total Records</span>
              <strong>{results.total_rows}</strong>
            </div>

            <div className="ml-summary-card">
              <Layers3 size={20} />
              <span>Training Records</span>
              <strong>{results.training_rows}</strong>
            </div>

            <div className="ml-summary-card">
              <Activity size={20} />
              <span>Testing Records</span>
              <strong>{results.testing_rows}</strong>
            </div>

            <div className="ml-summary-card">
              <CheckCircle2 size={20} />
              <span>Successful Models</span>
              <strong>{results.successful_models}</strong>
            </div>

          </div>


          {/* BEST MODEL */}

          <div className="ml-best-model">
            <div className="ml-best-icon">
              <Trophy size={25} />
            </div>

            <div>
              <span>BEST PERFORMING MODEL</span>
              <h2>{results.best_model}</h2>
              <p>
                Selected using the highest comparison score
                for this problem type.
              </p>
            </div>
          </div>


          {/* MODEL COMPARISON TABLE */}

          <div className="ml-table-card">

            <div className="ml-table-heading">
              <div>
                <h2>Model Comparison</h2>
                <p>
                  {results.problem_type.toUpperCase()}
                  {" · "}
                  Target: {results.target_column}
                </p>
              </div>

              <span className="ml-model-count">
                {results.models_tested} Models Tested
              </span>
            </div>

            <div className="ml-table-scroll">
              <table className="ml-results-table">

                <thead>
                  <tr>
                    <th>Model</th>

                    {results.problem_type === "classification" ? (
                      <>
                        <th>Accuracy</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>F1 Score</th>
                      </>
                    ) : (
                      <>
                        <th>MAE</th>
                        <th>RMSE</th>
                        <th>R² Score</th>
                      </>
                    )}

                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {results.results.map((result) => (
                    <tr key={result.model}>

                      <td>
                        <strong>{result.model}</strong>

                        {result.model === results.best_model && (
                          <span className="ml-winner-tag">
                            Best
                          </span>
                        )}
                      </td>

                      {result.status === "success" ? (
                        results.problem_type === "classification" ? (
                          <>
                            <td>
                              {(result.metrics.accuracy * 100).toFixed(2)}%
                            </td>

                            <td>
                              {result.metrics.precision.toFixed(4)}
                            </td>

                            <td>
                              {result.metrics.recall.toFixed(4)}
                            </td>

                            <td>
                              {result.metrics.f1_score.toFixed(4)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{result.metrics.mae}</td>
                            <td>{result.metrics.rmse}</td>
                            <td>{result.metrics.r2_score}</td>
                          </>
                        )
                      ) : (
                        <td
                          colSpan={
                            results.problem_type === "classification" ? 4 : 3
                          }
                          className="ml-failed"
                        >
                          {result.error || "Training failed"}
                        </td>
                      )}

                      <td>
                        <span
                          className={
                            result.status === "success"
                              ? "ml-status-success"
                              : "ml-status-failed"
                          }
                        >
                          {result.status}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </div>


          {/* ==================================
              ALL MODELS PERFORMANCE CHART
          ================================== */}

          {results.problem_type === "classification" &&
            modelComparisonData.length > 0 && (

            <div className="ml-visual-card ml-comparison-chart-card">

              <div className="ml-visual-heading">
                <div>
                  <h2>All Models Performance Comparison</h2>

                  <p>
                    Compare Accuracy, Precision, Recall and F1 Score
                    across all successful classification models.
                  </p>
                </div>
              </div>

              <div className="ml-chart-container">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart
                    data={modelComparisonData}
                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 45,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#303044"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="model"
                      stroke="#a5a5bd"
                      tick={{
                        fill: "#b9b9d0",
                        fontSize: 11,
                      }}
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                      height={65}
                    />

                    <YAxis
                      domain={[0, 100]}
                      stroke="#a5a5bd"
                      tick={{
                        fill: "#b9b9d0",
                        fontSize: 12,
                      }}
                      tickFormatter={(value) => `${value}%`}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#202030",
                        border: "1px solid #45455e",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                      formatter={(value) => [
                        `${Number(value).toFixed(2)}%`,
                      ]}
                    />

                    <Legend
                      wrapperStyle={{
                        color: "#d0d0e0",
                        fontSize: "12px",
                      }}
                    />

                    <Bar
                      dataKey="Accuracy"
                      fill="#8b5cf6"
                      radius={[5, 5, 0, 0]}
                    />

                    <Bar
                      dataKey="Precision"
                      fill="#38bdf8"
                      radius={[5, 5, 0, 0]}
                    />

                    <Bar
                      dataKey="Recall"
                      fill="#34d399"
                      radius={[5, 5, 0, 0]}
                    />

                    <Bar
                      dataKey="F1 Score"
                      fill="#f59e0b"
                      radius={[5, 5, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

              <p className="ml-chart-note">
                Higher percentages indicate better scores for these
                classification metrics. Results are based on the same
                held-out test set.
              </p>

            </div>
          )}


          {/* ==================================
              BEST MODEL PERFORMANCE BARS
          ================================== */}

          {results.problem_type === "classification" &&
            bestMetrics && (

            <div className="ml-visual-card">

              <div className="ml-visual-heading">
                <div>
                  <h2>Best Model Performance</h2>

                  <p>
                    Performance metrics for {results.best_model}
                  </p>
                </div>
              </div>

              <div className="ml-performance-grid">

                {[
                  {
                    name: "Accuracy",
                    value: bestMetrics.accuracy,
                  },
                  {
                    name: "Precision",
                    value: bestMetrics.precision,
                  },
                  {
                    name: "Recall",
                    value: bestMetrics.recall,
                  },
                  {
                    name: "F1 Score",
                    value: bestMetrics.f1_score,
                  },
                ].map((metric) => {

                  const percentage = Math.max(
                    0,
                    Math.min(100, metric.value * 100)
                  );

                  return (
                    <div
                      className="ml-performance-item"
                      key={metric.name}
                    >

                      <div className="ml-performance-label">
                        <span>{metric.name}</span>

                        <strong>
                          {percentage.toFixed(2)}%
                        </strong>
                      </div>

                      <div className="ml-progress-track">
                        <div
                          className="ml-progress-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  );
                })}

              </div>

            </div>
          )}


          {/* ==================================
              FEATURE IMPORTANCE
          ================================== */}

          {featureImportanceData.length > 0 && (

            <div className="ml-visual-card ml-feature-importance-card">

              <div className="ml-visual-heading">
                <div>
                  <h2>Feature Importance</h2>

                  <p>
                    Features influencing predictions by {results.best_model}
                  </p>
                </div>
              </div>

              <div className="ml-feature-chart-container">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart
                    data={featureImportanceData}
                    layout="vertical"
                    margin={{
                      top: 10,
                      right: 35,
                      left: 25,
                      bottom: 10,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#303044"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      stroke="#a5a5bd"
                      tick={{
                        fill: "#b9b9d0",
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="feature"
                      width={125}
                      stroke="#a5a5bd"
                      tick={{
                        fill: "#d0d0e0",
                        fontSize: 12,
                      }}
                    />

                    <ReferenceLine
                      x={0}
                      stroke="#9999b5"
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#202030",
                        border: "1px solid #45455e",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                      formatter={(value, name, item) => [
                        Number(value).toFixed(6),
                        "Importance",
                      ]}
                      labelFormatter={(label) => `Feature: ${label}`}
                    />

                    <Bar
                      dataKey="importance"
                      fill="#9b72f2"
                      radius={[0, 6, 6, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

              <p className="ml-chart-note">
                Permutation importance measures how model performance
                changes when a feature is shuffled. Higher positive
                values indicate greater importance. Negative values
                mean shuffling that feature improved the score.
              </p>

              <div className="ml-importance-details">

                <h3>Feature Importance Values</h3>

                <div className="ml-feature-list">

                  {featureImportanceData.map((item) => (
                    <span key={item.feature}>
                      {item.feature}: {item.importance.toFixed(6)}
                    </span>
                  ))}

                </div>

              </div>

            </div>
          )}


          {/* ==================================
              CONFUSION MATRIX
          ================================== */}

          {results.problem_type === "classification" && (
            <div className="ml-visual-card">

              <div className="ml-visual-heading">
                <div>
                  <h2>Confusion Matrix</h2>

                  <p>
                    Actual values compared with predicted values
                    for {results.best_model}
                  </p>
                </div>
              </div>

              {Array.isArray(matrix) && matrix.length > 0 ? (

                <>

                  <div className="ml-matrix-wrapper">

                    <div className="ml-matrix-axis">
                      Actual ↓
                      <span>Predicted →</span>
                    </div>

                    <table className="ml-confusion-table">

                      <thead>
                        <tr>
                          <th>Actual / Predicted</th>

                          {matrix.map((_, index) => (
                            <th key={index}>
                              {classLabels[index] ?? `Class ${index + 1}`}
                            </th>
                          ))}

                        </tr>
                      </thead>

                      <tbody>

                        {matrix.map((row, rowIndex) => (

                          <tr key={rowIndex}>

                            <th>
                              {classLabels[rowIndex] ?? `Class ${rowIndex + 1}`}
                            </th>

                            {row.map((value, colIndex) => {

                              const maxValue = Math.max(
                                1,
                                ...matrix.flat()
                              );

                              const intensity = value / maxValue;

                              return (
                                <td
                                  key={colIndex}
                                  style={{
                                    background: `rgba(124, 77, 255, ${
                                      0.12 + intensity * 0.65
                                    })`,
                                  }}
                                >
                                  <strong>{value}</strong>
                                </td>
                              );
                            })}

                          </tr>
                        ))}

                      </tbody>

                    </table>

                  </div>

                  <p className="ml-matrix-note">
                    Diagonal cells represent correct predictions.
                    Other cells represent incorrect predictions.
                  </p>

                </>

              ) : (
                <p>Confusion matrix data is not available.</p>
              )}

            </div>
          )}


          {/* ==================================
              FEATURE INFORMATION
          ================================== */}

          <div className="ml-feature-card">

            <Target size={20} />

            <div>
              <h3>Features used for training</h3>

              <div className="ml-feature-list">

                {results.feature_columns.map((column) => (
                  <span key={column}>{column}</span>
                ))}

              </div>
            </div>

          </div>


          {/* ==================================
              EVALUATION NOTE
          ================================== */}

          <div className="ml-evaluation-note">
            <AlertCircle size={17} />
            {results.evaluation_note}
          </div>

        </div>
      )}


      {/* ==================================
          EMPTY STATE
      ================================== */}

      {!results && !error && datasets.length > 0 && (

        <div className="ml-empty">

          <BrainCircuit size={43} />

          <h2>Ready to train your models?</h2>

          <p>
            Select your dataset, target column and problem type,
            then start your first machine learning experiment.
          </p>

        </div>
      )}

    </div>
  );
}


export default MachineLearning;
