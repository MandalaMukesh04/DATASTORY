
import React, { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Download,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Table2,
  FileType,
  ShieldCheck,
} from "lucide-react";

import {
  getDatasets,
  downloadPDFReport,
  downloadExcelReport,
  downloadCSVExport,
} from "../services/api";

import "./Reports.css";

const Reports = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [message, setMessage] = useState(null);

  // LOAD DATASETS

  const loadDatasets = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await getDatasets();

      const datasetList = Array.isArray(response)
        ? response
        : response.datasets || [];

      setDatasets(datasetList);

      if (datasetList.length > 0) {
        setSelectedDataset((current) => {
          const stillExists = datasetList.some(
            (dataset) => dataset.dataset_id === current
          );

          return stillExists
            ? current
            : datasetList[0].dataset_id;
        });
      } else {
        setSelectedDataset("");
      }
    } catch (error) {
      console.error("Dataset loading error:", error);
      setMessage({
        type: "error",
        text: "Unable to load datasets. Please check whether the backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // CURRENT DATASET

  const currentDataset = datasets.find(
    (dataset) => dataset.dataset_id === selectedDataset
  );

  // DOWNLOAD FILE

  const saveBlob = (blob, filename) => {
    const fileURL = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = fileURL;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(fileURL);
  };

  // HANDLE REPORT DOWNLOAD

  const handleDownload = async (type) => {
    if (!selectedDataset) {
      setMessage({
        type: "error",
        text: "Please select a dataset first.",
      });
      return;
    }

    try {
      setDownloading(type);
      setMessage(null);

      let file;
      let filename;

      const safeName = (
        currentDataset?.filename ||
        currentDataset?.name ||
        "datastory-report"
      ).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");

      if (type === "pdf") {
        file = await downloadPDFReport(selectedDataset);
        filename = `${safeName}_DATASTORY_Report.pdf`;
      } else if (type === "excel") {
        file = await downloadExcelReport(selectedDataset);
        filename = `${safeName}_DATASTORY_Report.xlsx`;
      } else {
        file = await downloadCSVExport(selectedDataset);
        filename = `${safeName}_DATASTORY_Export.csv`;
      }

      saveBlob(file, filename);

      setMessage({
        type: "success",
        text: `${filename} downloaded successfully.`,
      });
    } catch (error) {
      console.error("Report download error:", error);

      let errorMessage =
        "Unable to generate the file. Please try again.";

      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Keep the default error message.
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setDownloading("");
    }
  };

  // LOADING SCREEN

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-loading">
          <RefreshCw className="reports-spinner" size={28} />
          <p>Preparing your Reports Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">

      {/* HEADER */}

      <div className="reports-header">
        <div>
          <div className="reports-eyebrow">
            <FileText size={15} />
            DATASTORY INTELLIGENCE
          </div>

          <h1>Reports & Export Center</h1>

          <p>
            Turn your data analysis into professional,
            shareable reports and downloadable files.
          </p>
        </div>

        <button
          className="reports-refresh-button"
          onClick={loadDatasets}
          disabled={loading || downloading !== ""}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className={`reports-message ${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}

          <span>{message.text}</span>

          <button
            onClick={() => setMessage(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* DATASET SELECTOR */}

      <div className="reports-selector-card">
        <div className="reports-selector-icon">
          <Database size={22} />
        </div>

        <div className="reports-selector-content">
          <label htmlFor="reports-dataset">
            SELECT DATASET
          </label>

          <select
            id="reports-dataset"
            value={selectedDataset}
            onChange={(event) => {
              setSelectedDataset(event.target.value);
              setMessage(null);
            }}
            disabled={datasets.length === 0 || downloading !== ""}
          >
            {datasets.length === 0 ? (
              <option value="">No datasets available</option>
            ) : (
              datasets.map((dataset) => (
                <option
                  key={dataset.dataset_id}
                  value={dataset.dataset_id}
                >
                  {dataset.filename || dataset.name || dataset.dataset_id}
                </option>
              ))
            )}
          </select>

          <span>
            Choose the dataset you want to export.
          </span>
        </div>

        <div className="reports-dataset-count">
          <span>{datasets.length}</span>
          <small>Available datasets</small>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="reports-empty-state">
          <Database size={42} />
          <h2>No datasets found</h2>
          <p>
            Upload a CSV, Excel, or JSON dataset before
            generating reports.
          </p>
        </div>
      ) : (
        <>
          {/* DATASET OVERVIEW */}

          <div className="reports-section-heading">
            <div>
              <h2>Export Overview</h2>
              <p>Your selected dataset is ready for export.</p>
            </div>

            <span className="reports-ready-badge">
              <span className="reports-status-dot" />
              Dataset selected
            </span>
          </div>

          <div className="reports-overview-grid">
            <div className="reports-overview-card">
              <div className="reports-overview-icon blue">
                <Database size={20} />
              </div>

              <div>
                <span>Dataset</span>
                <strong>
                  {currentDataset?.filename ||
                    currentDataset?.name ||
                    "Selected dataset"}
                </strong>
              </div>
            </div>

            <div className="reports-overview-card">
              <div className="reports-overview-icon purple">
                <FileType size={20} />
              </div>

              <div>
                <span>Export Formats</span>
                <strong>3 Available</strong>
              </div>
            </div>

            <div className="reports-overview-card">
              <div className="reports-overview-icon green">
                <ShieldCheck size={20} />
              </div>

              <div>
                <span>Report Generation</span>
                <strong>Ready</strong>
              </div>
            </div>
          </div>

          {/* EXPORT OPTIONS */}

          <div className="reports-section-heading">
            <div>
              <h2>Download Your Reports</h2>
              <p>
                Choose a format based on how you want to
                use your data.
              </p>
            </div>
          </div>

          <div className="reports-export-grid">

            {/* PDF */}

            <div className="reports-export-card pdf-card">
              <div className="reports-export-top">
                <div className="reports-file-icon pdf-icon">
                  <FileText size={27} />
                </div>

                <span className="reports-format-label">
                  PDF DOCUMENT
                </span>
              </div>

              <h3>Professional PDF Report</h3>

              <p>
                A polished report containing your dataset
                overview, quality assessment, statistical
                analysis, business insights, and recommendations.
              </p>

              <div className="reports-feature-list">
                <span>
                  <CheckCircle2 size={15} />
                  Executive summary
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Data quality assessment
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Business insights
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Recommendations
                </span>
              </div>

              <button
                className="reports-download-button pdf-button"
                onClick={() => handleDownload("pdf")}
                disabled={downloading !== ""}
              >
                {downloading === "pdf" ? (
                  <>
                    <RefreshCw className="reports-spinner" size={17} />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Download PDF Report
                  </>
                )}
              </button>
            </div>

            {/* EXCEL */}

            <div className="reports-export-card excel-card">
              <div className="reports-export-top">
                <div className="reports-file-icon excel-icon">
                  <FileSpreadsheet size={27} />
                </div>

                <span className="reports-format-label">
                  EXCEL WORKBOOK
                </span>
              </div>

              <h3>Excel Analysis Workbook</h3>

              <p>
                Explore your dataset and analytical results
                in an organized Excel workbook with separate
                worksheets.
              </p>

              <div className="reports-feature-list">
                <span>
                  <CheckCircle2 size={15} />
                  Original dataset
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Dataset overview
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Column analysis
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Statistics and insights
                </span>
              </div>

              <button
                className="reports-download-button excel-button"
                onClick={() => handleDownload("excel")}
                disabled={downloading !== ""}
              >
                {downloading === "excel" ? (
                  <>
                    <RefreshCw className="reports-spinner" size={17} />
                    Generating Excel...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Download Excel Report
                  </>
                )}
              </button>
            </div>

            {/* CSV */}

            <div className="reports-export-card csv-card">
              <div className="reports-export-top">
                <div className="reports-file-icon csv-icon">
                  <Table2 size={27} />
                </div>

                <span className="reports-format-label">
                  CSV DATA FILE
                </span>
              </div>

              <h3>Raw Dataset Export</h3>

              <p>
                Download the selected dataset in CSV format
                for use in Excel, Python, Power BI, Tableau,
                and other data tools.
              </p>

              <div className="reports-feature-list">
                <span>
                  <CheckCircle2 size={15} />
                  Original dataset records
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Original column structure
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Easy data portability
                </span>

                <span>
                  <CheckCircle2 size={15} />
                  Compatible with analysis tools
                </span>
              </div>

              <button
                className="reports-download-button csv-button"
                onClick={() => handleDownload("csv")}
                disabled={downloading !== ""}
              >
                {downloading === "csv" ? (
                  <>
                    <RefreshCw className="reports-spinner" size={17} />
                    Exporting CSV...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* FOOTER NOTE */}

          <div className="reports-info-note">
            <div className="reports-info-icon">
              <BarChart3 size={19} />
            </div>

            <div>
              <strong>One dataset. Multiple possibilities.</strong>
              <p>
                Use PDF reports for sharing, Excel workbooks
                for deeper analysis, and CSV files for
                integrating your data into other tools.
                Your original uploaded dataset remains unchanged.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
