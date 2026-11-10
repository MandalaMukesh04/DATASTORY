import { useEffect, useState } from "react";

import {
  Database,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle,
  LoaderCircle,
  Table2
} from "lucide-react";

import {
  getDatasets,
  getDatasetDetails,
  deleteDataset
} from "../services/api";


function MyDatasets() {

  const [datasets, setDatasets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadDatasets = async () => {

    try {

      setLoading(true);
      setError("");

      const response = await getDatasets();

      setDatasets(response.datasets || []);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Unable to load datasets. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {
    loadDatasets();
  }, []);


  const filteredDatasets = datasets.filter((dataset) =>
    dataset.filename.toLowerCase().includes(search.toLowerCase())
  );


  const openDataset = async (datasetId) => {

    try {

      setDetailsLoading(true);
      setError("");

      const response = await getDatasetDetails(datasetId);

      setSelectedDataset(response);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Unable to open this dataset."
      );

    } finally {

      setDetailsLoading(false);

    }
  };


  const handleDelete = async (dataset) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete "${dataset.filename}"?`
    );

    if (!confirmed) return;

    try {

      setDeletingId(dataset.dataset_id);

      await deleteDataset(dataset.dataset_id);

      setDatasets((previous) =>
        previous.filter(
          (item) => item.dataset_id !== dataset.dataset_id
        )
      );

      if (
        selectedDataset?.dataset_id === dataset.dataset_id
      ) {
        setSelectedDataset(null);
      }

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Unable to delete dataset."
      );

    } finally {

      setDeletingId(null);

    }
  };


  const formatDate = (timestamp) => {

    return new Date(timestamp * 1000).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  };


  const getFileColor = (type) => {

    if (type === "CSV") return "csv";
    if (type === "XLSX" || type === "XLS") return "excel";

    return "json";
  };


  return (

    <div className="datasets-page">

      {/* PAGE HEADER */}

      <div className="datasets-heading">

        <div>
          <p className="eyebrow">DATA MANAGEMENT</p>

          <h1>My Datasets</h1>

          <p>
            Manage, explore and organize all your uploaded datasets.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadDatasets}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>

      </div>


      {/* SUMMARY */}

      <div className="dataset-summary">

        <div className="dataset-summary-card">

          <div className="dataset-summary-icon">
            <Database size={22} />
          </div>

          <div>
            <span>Total Datasets</span>
            <h2>{datasets.length}</h2>
          </div>

        </div>

        <div className="dataset-summary-card">

          <div className="dataset-summary-icon">
            <Table2 size={22} />
          </div>

          <div>
            <span>Total Records</span>

            <h2>
              {datasets.reduce(
                (total, item) => total + item.total_rows,
                0
              ).toLocaleString("en-IN")}
            </h2>
          </div>

        </div>

        <div className="dataset-summary-card">

          <div className="dataset-summary-icon">
            <FileSpreadsheet size={22} />
          </div>

          <div>
            <span>Total Columns</span>

            <h2>
              {datasets.reduce(
                (total, item) => total + item.total_columns,
                0
              )}
            </h2>
          </div>

        </div>

      </div>


      {/* DATASET LIBRARY */}

      <div className="dataset-library">

        <div className="library-header">

          <div>
            <h3>Dataset Library</h3>
            <p>Your uploaded data files</p>
          </div>

          <div className="dataset-search">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

          </div>

        </div>


        {error && (
          <div className="dataset-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}


        {loading ? (

          <div className="dataset-message">
            <LoaderCircle className="loading-icon" size={28} />
            <p>Loading your datasets...</p>
          </div>

        ) : filteredDatasets.length === 0 ? (

          <div className="empty-datasets">

            <Database size={40} />

            <h3>
              {search ? "No matching datasets" : "No datasets yet"}
            </h3>

            <p>
              {search
                ? "Try searching with another filename."
                : "Upload your first dataset to see it here."}
            </p>

          </div>

        ) : (

          <div className="dataset-table-wrapper">

            <table className="dataset-table">

              <thead>

                <tr>
                  <th>DATASET NAME</th>
                  <th>FORMAT</th>
                  <th>ROWS</th>
                  <th>COLUMNS</th>
                  <th>MISSING</th>
                  <th>UPLOADED</th>
                  <th>ACTIONS</th>
                </tr>

              </thead>


              <tbody>

                {filteredDatasets.map((dataset) => (

                  <tr key={dataset.dataset_id}>

                    <td>

                      <div className="dataset-name-cell">

                        <div className={`file-type-icon ${getFileColor(dataset.file_type)}`}>
                          <FileSpreadsheet size={19} />
                        </div>

                        <div>
                          <strong>{dataset.filename}</strong>
                          <span>{dataset.file_size} KB</span>
                        </div>

                      </div>

                    </td>


                    <td>
                      <span className={`format-badge ${getFileColor(dataset.file_type)}`}>
                        {dataset.file_type}
                      </span>
                    </td>


                    <td>
                      {dataset.total_rows.toLocaleString("en-IN")}
                    </td>


                    <td>
                      {dataset.total_columns}
                    </td>


                    <td>
                      <span className={
                        dataset.missing_values > 0
                          ? "missing-warning"
                          : "missing-success"
                      }>
                        {dataset.missing_values}
                      </span>
                    </td>


                    <td>
                      {formatDate(dataset.uploaded_at)}
                    </td>


                    <td>

                      <div className="dataset-actions">

                        <button
                          title="View dataset"
                          onClick={() => openDataset(dataset.dataset_id)}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          title="Delete dataset"
                          className="delete-action"
                          onClick={() => handleDelete(dataset)}
                          disabled={deletingId === dataset.dataset_id}
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* DATASET DETAIL MODAL */}

      {selectedDataset && (

        <div
          className="dataset-modal-overlay"
          onClick={() => setSelectedDataset(null)}
        >

          <div
            className="dataset-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <p className="eyebrow">DATASET DETAILS</p>
                <h2>{selectedDataset.dataset_id}</h2>
              </div>

              <button onClick={() => setSelectedDataset(null)}>
                <X size={20} />
              </button>

            </div>


            <div className="modal-stats">

              <div>
                <span>Rows</span>
                <strong>{selectedDataset.profile.total_rows}</strong>
              </div>

              <div>
                <span>Columns</span>
                <strong>{selectedDataset.profile.total_columns}</strong>
              </div>

              <div>
                <span>Missing Values</span>
                <strong>{selectedDataset.profile.total_missing_values}</strong>
              </div>

              <div>
                <span>Duplicates</span>
                <strong>{selectedDataset.profile.duplicate_rows}</strong>
              </div>

            </div>


            <h3>Data Preview</h3>

            <div className="dataset-table-wrapper">

              <table className="dataset-table">

                <thead>
                  <tr>
                    {selectedDataset.preview.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>

                  {selectedDataset.preview.rows.map((row, index) => (

                    <tr key={index}>

                      {selectedDataset.preview.columns.map((column) => (
                        <td key={column}>
                          {row[column] ?? "—"}
                        </td>
                      ))}

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>


            <h3 className="column-heading">Column Information</h3>

            <div className="column-information">

              {Object.entries(
                selectedDataset.profile.column_types
              ).map(([column, type]) => (

                <div key={column}>
                  <strong>{column}</strong>
                  <span>{type}</span>
                </div>

              ))}

            </div>

          </div>

        </div>

      )}

      {detailsLoading && (
        <div className="details-loading">
          <LoaderCircle className="loading-icon" size={25} />
          Opening dataset...
        </div>
      )}

    </div>

  );

}

export default MyDatasets;