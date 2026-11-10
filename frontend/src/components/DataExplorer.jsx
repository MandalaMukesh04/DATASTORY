import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Rows3,
  Columns3,
  AlertCircle,
  Copy,
  ShieldCheck,
  BarChart3,
  Table2,
  FileSpreadsheet,
  LoaderCircle,
  Search,
} from "lucide-react";

import {
  getDatasets,
  getDatasetAnalysis,
  getDatasetDetails,
} from "../services/api";

function DataExplorer() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("columns");
  const [previewSearch, setPreviewSearch] = useState("");

  // Load uploaded datasets
  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      setError("");

      const response = await getDatasets();
      const uploadedDatasets = response.datasets || [];

      setDatasets(uploadedDatasets);

      if (uploadedDatasets.length > 0) {
        setSelectedId((previousId) => {
          const stillExists = uploadedDatasets.some(
            (dataset) => dataset.dataset_id === previousId
          );

          return stillExists
            ? previousId
            : uploadedDatasets[0].dataset_id;
        });
      } else {
        setSelectedId("");
        setAnalysis(null);
        setPreview(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load datasets. Please check your backend server."
      );
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Load analysis and preview for selected dataset
  const loadAnalysis = async (datasetId) => {
    if (!datasetId) return;

    try {
      setLoadingAnalysis(true);
      setError("");
      setAnalysis(null);
      setPreview(null);

      const [analysisResponse, detailsResponse] = await Promise.all([
        getDatasetAnalysis(datasetId),
        getDatasetDetails(datasetId),
      ]);

      setAnalysis(analysisResponse.analysis);
      setPreview(detailsResponse.preview);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to analyze this dataset. Please try again."
      );
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAnalysis(selectedId);
    }
  }, [selectedId]);

  const overview = analysis?.overview || {};
  const quality = analysis?.data_quality || {};
  const columnAnalysis = analysis?.column_analysis || [];
  const statisticalSummary = analysis?.statistical_summary || {};

  const selectedDataset = datasets.find(
    (dataset) => dataset.dataset_id === selectedId
  );

  const previewColumns = preview?.columns || [];
  const previewRows = preview?.rows || [];

  const filteredRows = previewRows.filter((row) =>
    previewColumns.some((column) =>
      String(row[column] ?? "")
        .toLowerCase()
        .includes(previewSearch.toLowerCase())
    )
  );

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  const formatStat = (value) => {
    if (value === null || value === undefined) return "—";

    return Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });
  };

  const overviewCards = [
    {
      label: "Total Records",
      value: overview.total_rows,
      icon: Rows3,
      color: "purple",
    },
    {
      label: "Total Columns",
      value: overview.total_columns,
      icon: Columns3,
      color: "blue",
    },
    {
      label: "Missing Values",
      value: overview.total_missing_values,
      icon: AlertCircle,
      color: "orange",
    },
    {
      label: "Duplicate Rows",
      value: overview.duplicate_rows,
      icon: Copy,
      color: "green",
    },
  ];

  if (loadingDatasets) {
    return (
      <div className="explorer-loading">
        <LoaderCircle className="explorer-spinner" size={30} />
        <p>Loading your datasets...</p>
      </div>
    );
  }

  return (
    <div className="data-explorer-page">
      {/* Page Header */}
      <div className="explorer-header">
        <div>
          <div className="explorer-heading">
            <div className="explorer-heading-icon">
              <BarChart3 size={23} />
            </div>

            <div>
              <h1>Data Explorer</h1>
              <p>
                Discover, inspect and understand your data with intelligent
                analysis.
              </p>
            </div>
          </div>
        </div>

        <button
          className="explorer-refresh"
          onClick={() => {
            if (selectedId) {
              loadAnalysis(selectedId);
            } else {
              loadDatasets();
            }
          }}
          disabled={loadingAnalysis}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Dataset Selector */}
      <div className="explorer-selector-card">
        <div className="explorer-selector-info">
          <div className="explorer-selector-icon">
            <Database size={22} />
          </div>

          <div>
            <h3>Select Dataset</h3>
            <p>Choose an uploaded dataset to begin exploring.</p>
          </div>
        </div>

        <select
          className="explorer-select"
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

      {/* Error Message */}
      {error && (
        <div className="explorer-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Empty State */}
      {datasets.length === 0 && !error && (
        <div className="explorer-empty">
          <Database size={45} />
          <h2>No datasets found</h2>
          <p>Upload a dataset first to start exploring your data.</p>
        </div>
      )}

      {/* Loading Analysis */}
      {loadingAnalysis && (
        <div className="explorer-loading">
          <LoaderCircle className="explorer-spinner" size={30} />
          <p>Analyzing your dataset...</p>
        </div>
      )}

      {/* Analysis Content */}
      {!loadingAnalysis && analysis && (
        <>
          {/* Selected Dataset Information */}
          <div className="explorer-dataset-info">
            <div className="explorer-file-icon">
              <FileSpreadsheet size={21} />
            </div>

            <div>
              <h3>{selectedDataset?.filename || "Selected Dataset"}</h3>
              <p>
                {selectedDataset?.file_type || "DATA"} file ·{" "}
                {formatNumber(overview.total_rows)} records ·{" "}
                {formatNumber(overview.total_columns)} columns
              </p>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="explorer-section-heading">
            <h2>Dataset Overview</h2>
            <span>Live analysis</span>
          </div>

          <div className="explorer-stats-grid">
            {overviewCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  className="explorer-stat-card"
                  key={card.label}
                >
                  <div className={`explorer-stat-icon ${card.color}`}>
                    <Icon size={21} />
                  </div>

                  <div>
                    <p>{card.label}</p>
                    <h2>{formatNumber(card.value)}</h2>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Quality */}
          <div className="explorer-quality-card">
            <div className="explorer-quality-header">
              <div className="explorer-quality-title">
                <div className="explorer-quality-icon">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2>Data Quality</h2>
                  <p>Initial quality assessment of your dataset</p>
                </div>
              </div>

              <div className="explorer-quality-score">
                <strong>
                  {formatStat(quality.quality_score)}%
                </strong>
                <span>Quality Score</span>
              </div>
            </div>

            <div className="explorer-progress-track">
              <div
                className="explorer-progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, Number(quality.quality_score || 0))
                  )}%`,
                }}
              />
            </div>

            <div className="explorer-quality-details">
              <div>
                <span>Missing Data</span>
                <strong>{formatStat(quality.missing_percentage)}%</strong>
              </div>

              <div>
                <span>Duplicate Data</span>
                <strong>
                  {formatStat(quality.duplicate_percentage)}%
                </strong>
              </div>
            </div>

            <p className="explorer-quality-note">
              This preliminary score is calculated using missing-value
              percentage and duplicate-row percentage. It is not a
              complete measure of data accuracy.
            </p>
          </div>

          {/* Analysis Tabs */}
          <div className="explorer-analysis-card">
            <div className="explorer-tabs">
              <button
                className={activeTab === "columns" ? "active" : ""}
                onClick={() => setActiveTab("columns")}
              >
                <Columns3 size={16} />
                Column Analysis
              </button>

              <button
                className={activeTab === "statistics" ? "active" : ""}
                onClick={() => setActiveTab("statistics")}
              >
                <BarChart3 size={16} />
                Statistics
              </button>

              <button
                className={activeTab === "preview" ? "active" : ""}
                onClick={() => setActiveTab("preview")}
              >
                <Table2 size={16} />
                Data Preview
              </button>
            </div>

            {/* Column Analysis */}
            {activeTab === "columns" && (
              <div className="explorer-tab-content">
                <div className="explorer-table-heading">
                  <div>
                    <h2>Column Analysis</h2>
                    <p>Detailed information about each column.</p>
                  </div>

                  <span>{columnAnalysis.length} columns</span>
                </div>

                <div className="explorer-table-wrapper">
                  <table className="explorer-table">
                    <thead>
                      <tr>
                        <th>Column Name</th>
                        <th>Data Type</th>
                        <th>Total Values</th>
                        <th>Missing</th>
                        <th>Unique Values</th>
                      </tr>
                    </thead>

                    <tbody>
                      {columnAnalysis.map((column, index) => (
                        <tr key={`${column.column_name}-${index}`}>
                          <td className="explorer-column-name">
                            {column.column_name}
                          </td>

                          <td>
                            <span className="explorer-type-badge">
                              {column.data_type}
                            </span>
                          </td>

                          <td>{formatNumber(column.total_values)}</td>

                          <td
                            className={
                              column.missing_values > 0
                                ? "explorer-warning-text"
                                : "explorer-success-text"
                            }
                          >
                            {formatNumber(column.missing_values)}
                          </td>

                          <td>{formatNumber(column.unique_values)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Statistical Summary */}
            {activeTab === "statistics" && (
              <div className="explorer-tab-content">
                <div className="explorer-table-heading">
                  <div>
                    <h2>Statistical Summary</h2>
                    <p>
                      Statistical measurements for numerical columns.
                    </p>
                  </div>
                </div>

                {Object.keys(statisticalSummary).length === 0 ? (
                  <div className="explorer-empty-small">
                    <BarChart3 size={30} />
                    <p>
                      No numerical columns are available for statistical
                      analysis.
                    </p>
                  </div>
                ) : (
                  <div className="explorer-table-wrapper">
                    <table className="explorer-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Count</th>
                          <th>Mean</th>
                          <th>Std Dev</th>
                          <th>Min</th>
                          <th>25%</th>
                          <th>Median</th>
                          <th>75%</th>
                          <th>Max</th>
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(statisticalSummary).map(
                          ([column, stats]) => (
                            <tr key={column}>
                              <td className="explorer-column-name">
                                {column}
                              </td>

                              <td>{formatStat(stats.count)}</td>
                              <td>{formatStat(stats.mean)}</td>
                              <td>{formatStat(stats.std)}</td>
                              <td>{formatStat(stats.min)}</td>
                              <td>{formatStat(stats["25%"])}</td>
                              <td>{formatStat(stats["50%"])}</td>
                              <td>{formatStat(stats["75%"])}</td>
                              <td>{formatStat(stats.max)}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Data Preview */}
            {activeTab === "preview" && (
              <div className="explorer-tab-content">
                <div className="explorer-table-heading">
                  <div>
                    <h2>Data Preview</h2>
                    <p>Preview of the first 20 records.</p>
                  </div>

                  <div className="explorer-preview-search">
                    <Search size={16} />

                    <input
                      type="text"
                      placeholder="Search records..."
                      value={previewSearch}
                      onChange={(event) =>
                        setPreviewSearch(event.target.value)
                      }
                    />
                  </div>
                </div>

                {previewColumns.length === 0 ? (
                  <div className="explorer-empty-small">
                    <Table2 size={30} />
                    <p>No preview data available.</p>
                  </div>
                ) : (
                  <div className="explorer-table-wrapper">
                    <table className="explorer-table">
                      <thead>
                        <tr>
                          <th>#</th>

                          {previewColumns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRows.map((row, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>

                            {previewColumns.map((column) => (
                              <td key={column}>
                                {row[column] === null ||
                                row[column] === undefined
                                  ? "—"
                                  : String(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}

                        {filteredRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={previewColumns.length + 1}
                              className="explorer-no-results"
                            >
                              No matching records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="explorer-preview-footer">
                  Showing {filteredRows.length} of {previewRows.length}{" "}
                  preview records.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DataExplorer;