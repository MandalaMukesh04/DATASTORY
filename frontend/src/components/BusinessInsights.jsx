import { useEffect, useState } from "react";

import {
  Sparkles,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  TrendingUp,
  BarChart3,
  ShieldCheck
} from "lucide-react";

import { getDatasets, getBusinessInsights } from "../services/api";

import "./BusinessInsights.css";


function BusinessInsights() {

  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [insightsData, setInsightsData] = useState(null);

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      loadBusinessInsights(selectedDataset);
    }
  }, [selectedDataset]);


  const loadDatasets = async () => {

    try {

      setLoadingDatasets(true);
      setError("");

      const response = await getDatasets();

      const availableDatasets = response.datasets || [];

      setDatasets(availableDatasets);

      if (availableDatasets.length > 0) {
        setSelectedDataset(availableDatasets[0].dataset_id);
      }

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Unable to load datasets."
      );

    } finally {

      setLoadingDatasets(false);

    }
  };


  const loadBusinessInsights = async (datasetId) => {

    try {

      setLoadingInsights(true);
      setError("");
      setInsightsData(null);

      const response = await getBusinessInsights(datasetId);

      setInsightsData(response.business_insights);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Unable to generate business insights."
      );

    } finally {

      setLoadingInsights(false);

    }
  };


  const handleRefresh = () => {

    if (selectedDataset) {
      loadBusinessInsights(selectedDataset);
    }

  };


  const getImportanceIcon = (importance) => {

    switch (importance) {

      case "warning":
        return <AlertTriangle size={19} />;

      case "success":
        return <CheckCircle2 size={19} />;

      default:
        return <Info size={19} />;

    }

  };


  const getImportanceClass = (importance) => {

    switch (importance) {

      case "warning":
        return "insight-warning";

      case "success":
        return "insight-success";

      default:
        return "insight-info";

    }

  };


  const overview = insightsData?.dataset_overview;

  return (

    <div className="business-insights-page">

      {/* HEADER */}

      <div className="business-header">

        <div>

          <div className="business-eyebrow">
            <Sparkles size={15} />
            DATA INTELLIGENCE
          </div>

          <h1>
            Business <span>Insights</span>
          </h1>

          <p>
            Discover meaningful patterns, unusual values and
            business opportunities hidden in your data.
          </p>

        </div>

        <button
          className="business-refresh"
          onClick={handleRefresh}
          disabled={!selectedDataset || loadingInsights}
        >

          <RefreshCw
            size={16}
            className={loadingInsights ? "business-spin" : ""}
          />

          Refresh Insights

        </button>

      </div>


      {/* DATASET SELECTOR */}

      <div className="business-selector">

        <div className="business-selector-icon">
          <Database size={22} />
        </div>

        <div className="business-selector-info">

          <strong>Select Dataset</strong>

          <span>
            Choose a dataset to generate business insights.
          </span>

        </div>

        <select
          value={selectedDataset}
          onChange={(event) => setSelectedDataset(event.target.value)}
          disabled={loadingDatasets || datasets.length === 0}
        >

          {loadingDatasets ? (

            <option value="">Loading datasets...</option>

          ) : datasets.length === 0 ? (

            <option value="">No datasets available</option>

          ) : (

            datasets.map((dataset) => (

              <option
                key={dataset.dataset_id}
                value={dataset.dataset_id}
              >
                {dataset.filename}
              </option>

            ))

          )}

        </select>

      </div>


      {/* LOADING */}

      {loadingInsights && (

        <div className="business-loading">

          <div className="business-loader-icon">
            <Sparkles size={27} />
          </div>

          <h3>Analyzing your dataset...</h3>

          <p>
            Examining numerical patterns, categories,
            correlations and data quality.
          </p>

        </div>

      )}


      {/* ERROR */}

      {error && (

        <div className="business-error">
          <AlertTriangle size={19} />
          {error}
        </div>

      )}


      {/* RESULTS */}

      {!loadingInsights && insightsData && (

        <>

          {/* EXECUTIVE SUMMARY */}

          <section className="executive-summary">

            <div className="executive-icon">
              <Sparkles size={24} />
            </div>

            <div className="executive-content">

              <span>EXECUTIVE SUMMARY</span>

              <h2>
                Your dataset, explained.
              </h2>

              <p>
                {insightsData.executive_summary}
              </p>

            </div>

          </section>


          {/* DATASET OVERVIEW */}

          {overview && (

            <section className="business-metrics">

              <div className="business-metric-card">

                <div className="metric-icon purple-bg">
                  <Database size={20} />
                </div>

                <span>Total Records</span>

                <strong>
                  {Number(overview.total_rows).toLocaleString()}
                </strong>

              </div>


              <div className="business-metric-card">

                <div className="metric-icon blue-bg">
                  <BarChart3 size={20} />
                </div>

                <span>Total Columns</span>

                <strong>
                  {overview.total_columns}
                </strong>

              </div>


              <div className="business-metric-card">

                <div className="metric-icon orange-bg">
                  <AlertTriangle size={20} />
                </div>

                <span>Missing Values</span>

                <strong>
                  {Number(overview.missing_values).toLocaleString()}
                </strong>

              </div>


              <div className="business-metric-card">

                <div className="metric-icon green-bg">
                  <ShieldCheck size={20} />
                </div>

                <span>Duplicate Rows</span>

                <strong>
                  {Number(overview.duplicate_rows).toLocaleString()}
                </strong>

              </div>

            </section>

          )}


          {/* FINDINGS HEADER */}

          <div className="business-section-heading">

            <div>

              <h2>Key Findings</h2>

              <p>
                Calculated discoveries from your uploaded dataset.
              </p>

            </div>

            <span className="insight-count">
              {insightsData.total_insights} Findings
            </span>

          </div>


          {/* INSIGHT CARDS */}

          <section className="business-insight-grid">

            {insightsData.insights?.map((insight, index) => (

              <article
                className={`business-insight-card ${getImportanceClass(insight.importance)}`}
                key={index}
              >

                <div className="insight-card-top">

                  <div className="insight-card-icon">
                    {getImportanceIcon(insight.importance)}
                  </div>

                  <span className="insight-category">
                    {insight.category}
                  </span>

                </div>


                <h3>
                  {insight.title}
                </h3>

                <p>
                  {insight.description}
                </p>


                {insight.metrics && (

                  <div className="insight-metrics">

                    {Object.entries(insight.metrics).map(
                      ([key, value]) => {

                        if (
                          value === null ||
                          typeof value === "object"
                        ) {
                          return null;
                        }

                        return (

                          <div key={key}>

                            <span>
                              {key.replaceAll("_", " ")}
                            </span>

                            <strong>
                              {typeof value === "number"
                                ? value.toLocaleString(undefined, {
                                    maximumFractionDigits: 3
                                  })
                                : String(value)}
                            </strong>

                          </div>

                        );

                      }
                    )}

                  </div>

                )}

              </article>

            ))}

          </section>


          {/* RECOMMENDATIONS */}

          <div className="business-section-heading recommendation-heading">

            <div>

              <h2>Business Recommendations</h2>

              <p>
                Suggested next steps based on your dataset.
              </p>

            </div>

          </div>


          <section className="recommendation-grid">

            {insightsData.recommendations?.map(
              (recommendation, index) => (

                <div
                  className="recommendation-card"
                  key={index}
                >

                  <div className="recommendation-icon">
                    <Lightbulb size={20} />
                  </div>

                  <div>

                    <h3>
                      {recommendation.title}
                    </h3>

                    <p>
                      {recommendation.description}
                    </p>

                  </div>

                </div>

              )
            )}

          </section>


          {/* FOOTER */}

          <div className="business-footer">

            <TrendingUp size={16} />

            <span>
              DATASTORY BUSINESS INTELLIGENCE ENGINE
            </span>

            <span>
              Insights calculated from your uploaded data
            </span>

          </div>

        </>

      )}


      {/* NO DATASETS */}

      {!loadingDatasets && datasets.length === 0 && (

        <div className="business-empty">

          <Database size={30} />

          <h3>No datasets found</h3>

          <p>
            Upload a CSV, Excel or JSON dataset before
            generating business insights.
          </p>

        </div>

      )}

    </div>

  );

}

export default BusinessInsights;