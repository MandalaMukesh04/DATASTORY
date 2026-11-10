
import { useEffect, useMemo, useState } from "react";

import {
  getDatasets,
  getLatestTrainingSession,
  predictDatasetValue,
} from "../services/api";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  Database,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import "./ModelPrediction.css";

function ModelPrediction() {
  const [datasets, setDatasets] = useState([]);
  const [session, setSession] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [inputValues, setInputValues] = useState({});
  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadPredictionSession();
  }, []);

  const loadPredictionSession = async () => {
    try {
      setLoading(true);
      setError("");

      const savedSession = getLatestTrainingSession();

      if (!savedSession) {
        setSession(null);
        return;
      }

      const datasetResponse = await getDatasets();

      const availableDatasets = datasetResponse.datasets || [];

      const datasetExists = availableDatasets.some(
        (item) => item.dataset_id === savedSession.dataset_id
      );

      if (!datasetExists) {
        setSession(null);
        setError("The dataset for this training session is no longer available.");
        return;
      }

      setDatasets(availableDatasets);
      setSession(savedSession);

      const successfulModels = (savedSession.results || [])
        .filter((item) => item.status === "success")
        .map((item) => item.model);

      const defaultModel = successfulModels.includes(
        savedSession.best_model
      )
        ? savedSession.best_model
        : successfulModels[0] || "";

      setSelectedModel(defaultModel);

      const initialValues = {};

      (savedSession.prediction_schema || []).forEach((field) => {
        initialValues[field.name] = field.default_value ?? "";
      });

      setInputValues(initialValues);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your prediction session."
      );
    } finally {
      setLoading(false);
    }
  };

  const successfulModels = useMemo(() => {
    return (session?.results || [])
      .filter((item) => item.status === "success")
      .map((item) => item.model);
  }, [session]);

  const selectedDataset = datasets.find(
    (item) => item.dataset_id === session?.dataset_id
  );

  const handleInputChange = (fieldName, value) => {
    setInputValues((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setPrediction(null);
  };

  const handlePrediction = async (event) => {
    event.preventDefault();

    if (!session || !selectedModel) {
      setError("Please train a model and select a model first.");
      return;
    }

    try {
      setPredicting(true);
      setError("");
      setPrediction(null);

      const response = await predictDatasetValue(
        session.dataset_id,
        session.training_id,
        selectedModel,
        inputValues
      );

      const result = response.prediction_result;

      setPrediction(result);

      setHistory((previous) => [
        {
          id: `${Date.now()}-${previous.length}`,
          model: selectedModel,
          result: result.prediction,
          problemType: result.problem_type,
          time: new Date().toLocaleTimeString(),
        },
        ...previous,
      ]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Prediction failed. Please check your input values."
      );
    } finally {
      setPredicting(false);
    }
  };

  const resetInputs = () => {
    const initialValues = {};

    (session?.prediction_schema || []).forEach((field) => {
      initialValues[field.name] = field.default_value ?? "";
    });

    setInputValues(initialValues);
    setPrediction(null);
    setError("");
  };

  if (loading) {
    return (
      <div className="prediction-loading">
        <LoaderCircle size={30} className="prediction-spin" />
        <p>Preparing your Prediction Lab...</p>
      </div>
    );
  }

  return (
    <div className="prediction-page">
      <div className="prediction-header">
        <div>
          <span className="prediction-eyebrow">
            DATASTORY INTELLIGENCE
          </span>
          <h1>Model Prediction Lab</h1>
          <p>
            Use your trained machine learning models to predict
            outcomes for new records.
          </p>
        </div>

        <div className="prediction-header-icon">
          <Target size={30} />
        </div>
      </div>

      {!session ? (
        <div className="prediction-empty">
          <div className="prediction-empty-icon">
            <BrainCircuit size={42} />
          </div>

          <h2>No trained model available</h2>

          <p>
            First train a classification or regression model in
            the Machine Learning Lab. Your latest training session
            will automatically appear here.
          </p>

          <div className="prediction-empty-hint">
            <CircleHelp size={17} />
            Keep the backend running after training your model.
          </div>

          <button
            className="prediction-secondary-button"
            onClick={loadPredictionSession}
          >
            <RefreshCw size={17} />
            Refresh Session
          </button>
        </div>
      ) : (
        <>
          <div className="prediction-session-card">
            <div className="prediction-session-icon">
              <Database size={21} />
            </div>

            <div className="prediction-session-details">
              <span>ACTIVE TRAINING SESSION</span>
              <strong>
                {selectedDataset?.filename || session.dataset_id}
              </strong>
              <small>
                Target: {session.target_column} ·{" "}
                {session.problem_type}
              </small>
            </div>

            <div className="prediction-session-status">
              <CheckCircle2 size={16} />
              Ready
            </div>
          </div>

          <div className="prediction-workspace">
            <form
              className="prediction-form-card"
              onSubmit={handlePrediction}
            >
              <div className="prediction-section-heading">
                <div className="prediction-heading-icon">
                  <Activity size={20} />
                </div>

                <div>
                  <h2>Prediction Configuration</h2>
                  <p>
                    Choose a trained model and enter new record values.
                  </p>
                </div>
              </div>

              <div className="prediction-model-field">
                <label htmlFor="prediction-model">
                  Select Trained Model
                </label>

                <select
                  id="prediction-model"
                  value={selectedModel}
                  onChange={(event) => {
                    setSelectedModel(event.target.value);
                    setPrediction(null);
                  }}
                >
                  {successfulModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                      {model === session.best_model ? " (Best Model)" : ""}
                    </option>
                  ))}
                </select>

                <small>
                  Best model: {session.best_model}
                </small>
              </div>

              <div className="prediction-input-heading">
                <h3>Input Features</h3>
                <span>
                  {session.prediction_schema?.length || 0} fields
                </span>
              </div>

              <div className="prediction-fields-grid">
                {(session.prediction_schema || []).map((field) => (
                  <div className="prediction-field" key={field.name}>
                    <label htmlFor={`field-${field.name}`}>
                      {field.name}
                      <span>
                        {field.type === "number" ? "Numeric" : "Category"}
                      </span>
                    </label>

                    {field.type === "categorical" &&
                    field.options?.length > 0 ? (
                      <select
                        id={`field-${field.name}`}
                        value={inputValues[field.name] ?? ""}
                        onChange={(event) =>
                          handleInputChange(field.name, event.target.value)
                        }
                        required
                      >
                        <option value="">Select {field.name}</option>

                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`field-${field.name}`}
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        value={inputValues[field.name] ?? ""}
                        onChange={(event) =>
                          handleInputChange(field.name, event.target.value)
                        }
                        placeholder={`Enter ${field.name}`}
                        required
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="prediction-form-actions">
                <button
                  type="button"
                  className="prediction-reset-button"
                  onClick={resetInputs}
                >
                  <RefreshCw size={16} />
                  Reset Values
                </button>

                <button
                  type="submit"
                  className="prediction-submit-button"
                  disabled={predicting || !selectedModel}
                >
                  {predicting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="prediction-spin"
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Predict Now
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="prediction-result-card">
              <div className="prediction-section-heading">
                <div className="prediction-heading-icon result-icon">
                  <TrendingUp size={20} />
                </div>

                <div>
                  <h2>Prediction Result</h2>
                  <p>Your model output will appear here.</p>
                </div>
              </div>

              {!prediction ? (
                <div className="prediction-result-placeholder">
                  <div className="prediction-placeholder-icon">
                    <Target size={34} />
                  </div>

                  <h3>Ready for prediction</h3>

                  <p>
                    Enter your input values and select Predict Now
                    to see the model's result.
                  </p>
                </div>
              ) : (
                <div className="prediction-result-content">
                  <span className="prediction-result-label">
                    PREDICTED {prediction.target_column.toUpperCase()}
                  </span>

                  <div className="prediction-main-value">
                    {String(prediction.prediction)}
                  </div>

                  <div className="prediction-result-meta">
                    <span>Model</span>
                    <strong>{prediction.model}</strong>
                  </div>

                  {prediction.confidence !== null && (
                    <div className="prediction-confidence">
                      <div className="prediction-confidence-heading">
                        <span>Top class probability</span>
                        <strong>
                          {(prediction.confidence * 100).toFixed(2)}%
                        </strong>
                      </div>

                      <div className="prediction-confidence-track">
                        <div
                          className="prediction-confidence-fill"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, prediction.confidence * 100)
                            )}%`,
                          }}
                        />
                      </div>

                      <small>
                        This is the model's estimated class probability,
                        not a guarantee of correctness.
                      </small>
                    </div>
                  )}

                  {prediction.probabilities?.length > 0 && (
                    <div className="prediction-probabilities">
                      <h3>Class Probabilities</h3>

                      {prediction.probabilities.map((item) => (
                        <div
                          className="prediction-probability-row"
                          key={item.class}
                        >
                          <div>
                            <span>{item.class}</span>
                            <strong>
                              {(item.probability * 100).toFixed(2)}%
                            </strong>
                          </div>

                          <div className="prediction-probability-track">
                            <div
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, item.probability * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {prediction.problem_type === "regression" && (
                    <div className="prediction-regression-note">
                      <TrendingUp size={17} />
                      This is a numerical prediction generated by
                      your regression model.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="prediction-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="prediction-history-card">
            <div className="prediction-history-heading">
              <div>
                <h2>Recent Predictions</h2>
                <p>
                  Predictions made during this page session.
                </p>
              </div>

              <span>{history.length} predictions</span>
            </div>

            {history.length === 0 ? (
              <div className="prediction-history-empty">
                No predictions generated yet.
              </div>
            ) : (
              <div className="prediction-history-list">
                {history.map((item) => (
                  <div
                    className="prediction-history-row"
                    key={item.id}
                  >
                    <div className="prediction-history-icon">
                      <Activity size={18} />
                    </div>

                    <div className="prediction-history-details">
                      <strong>{String(item.result)}</strong>
                      <span>
                        {item.model} · {item.problemType}
                      </span>
                    </div>

                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {error && !session && (
        <div className="prediction-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ModelPrediction;
