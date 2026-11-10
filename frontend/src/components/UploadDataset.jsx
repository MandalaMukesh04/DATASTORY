import { useState } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react";
import { uploadDataset } from "../services/api";

function UploadDataset() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    const allowedExtensions = [
      ".csv",
      ".xlsx",
      ".xls",
      ".json",
    ];

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Please upload CSV, Excel, or JSON files.");
      setFile(null);
      return;
    }

    setError("");
    setResult(null);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a dataset first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await uploadDataset(file);

      setResult(data);

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to upload dataset. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">

      <div className="upload-heading">
        <div>
          <p className="eyebrow">DATA MANAGEMENT</p>
          <h1>Upload Dataset</h1>
          <p>
            Import your data and let DATASTORY discover
            meaningful insights.
          </p>
        </div>
      </div>

      <div className="upload-card">

        <div className="upload-icon">
          <Upload size={30} />
        </div>

        <h2>Upload your dataset</h2>

        <p>
          Select a CSV, Excel, or JSON file from your computer.
        </p>

        <label className="file-drop-area">

          <FileSpreadsheet size={38} />

          <strong>
            {file ? file.name : "Choose a dataset"}
          </strong>

          <span>
            Click here to browse files
          </span>

          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileChange}
            hidden
          />

        </label>

        {file && (
          <div className="selected-file">
            <span>{file.name}</span>

            <button
              onClick={() => setFile(null)}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {error && (
          <div className="upload-error">
            {error}
          </div>
        )}

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Analyzing Dataset..." : "Upload & Analyze"}
        </button>

      </div>

      {result && (
        <div className="dataset-result">

          <h2>
            <CheckCircle size={22} />
            Dataset uploaded successfully!
          </h2>

          <div className="result-stats">

            <div>
              <span>Total Rows</span>
              <strong>{result.profile.total_rows}</strong>
            </div>

            <div>
              <span>Total Columns</span>
              <strong>{result.profile.total_columns}</strong>
            </div>

            <div>
              <span>Missing Values</span>
              <strong>{result.profile.total_missing_values}</strong>
            </div>

            <div>
              <span>Duplicate Rows</span>
              <strong>{result.profile.duplicate_rows}</strong>
            </div>

          </div>

          <h3>Dataset Preview</h3>

          <div className="table-wrapper">

            <table>
              <thead>
                <tr>
                  {result.preview.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.preview.rows.map((row, index) => (
                  <tr key={index}>
                    {result.preview.columns.map((column) => (
                      <td key={column}>
                        {row[column] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

          </div>

        </div>
      )}

    </div>
  );
}

export default UploadDataset;