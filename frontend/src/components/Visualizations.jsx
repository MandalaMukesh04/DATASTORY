import { useEffect, useMemo, useRef, useState } from "react";

import {
  getDatasets,
  getDatasetVisualizations,
} from "../services/api";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  RefreshCw,
  Database,
  Sparkles,
  Settings2,
  AlertCircle,
  LoaderCircle,
  ChartColumn,
  Download,
} from "lucide-react";

const CHART_COLORS = [
  "#9b7cf7",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#2dd4bf",
  "#f97316",
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "histogram", label: "Histogram", icon: ChartColumn },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
];

function makeHistogram(values, numberOfBins = 8) {
  const numbers = values
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) return [];

  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);

  if (minimum === maximum) {
    return [
      {
        range: String(minimum),
        count: numbers.length,
      },
    ];
  }

  const binWidth = (maximum - minimum) / numberOfBins;

  const bins = Array.from({ length: numberOfBins }, (_, index) => {
    const start = minimum + index * binWidth;
    const end = start + binWidth;

    return {
      range: `${start.toFixed(1)} - ${end.toFixed(1)}`,
      start,
      end,
      count: 0,
    };
  });

  numbers.forEach((value) => {
    let index = Math.floor((value - minimum) / binWidth);

    if (index >= numberOfBins) {
      index = numberOfBins - 1;
    }

    bins[index].count += 1;
  });

  return bins;
}

function buildCategoryData(values) {
  const counts = {};

  values.forEach((value) => {
    const label =
      value === null || value === undefined || value === ""
        ? "Missing"
        : String(value);

    counts[label] = (counts[label] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function Visualizations() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [visualizationData, setVisualizationData] = useState(null);

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState("automatic");

  // Manual chart settings
  const [chartType, setChartType] = useState("bar");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [aggregation, setAggregation] = useState("average");
  const chartAreaRef = useRef(null);
  const [exportingChart, setExportingChart] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Load uploaded datasets
  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      setError("");

      const response = await getDatasets();
      const availableDatasets = response.datasets || [];

      setDatasets(availableDatasets);

      if (availableDatasets.length > 0) {
        setSelectedId((previousId) => {
          const exists = availableDatasets.some(
            (item) => item.dataset_id === previousId
          );

          return exists ? previousId : availableDatasets[0].dataset_id;
        });
      } else {
        setSelectedId("");
        setVisualizationData(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load datasets. Please check your backend."
      );
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Load visualization data
  const loadVisualizations = async (datasetId) => {
    if (!datasetId) return;

    try {
      setLoadingCharts(true);
      setError("");
      setVisualizationData(null);

      const response = await getDatasetVisualizations(datasetId);
      const data = response.visualizations;

      setVisualizationData(data);

      // Set default columns for manual chart builder
      const numeric = data.numeric_columns || [];
      const categorical = data.categorical_columns || [];

      setXColumn((previous) => {
        if (previous && data.chart_data?.[0]?.[previous] !== undefined) {
          return previous;
        }

        return categorical[0] || numeric[0] || "";
      });

      setYColumn((previous) => {
        if (
          previous &&
          numeric.includes(previous) &&
          previous !== (categorical[0] || numeric[0])
        ) {
          return previous;
        }

        return numeric.find(
          (column) => column !== (categorical[0] || numeric[0])
        ) || numeric[0] || "";
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to generate visualizations."
      );
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadVisualizations(selectedId);
    }
  }, [selectedId]);

  const selectedDataset = datasets.find(
    (dataset) => dataset.dataset_id === selectedId
  );

  const numericColumns = visualizationData?.numeric_columns || [];
  const categoricalColumns = visualizationData?.categorical_columns || [];
  const chartData = visualizationData?.chart_data || [];
  const categorySummaries = visualizationData?.category_summaries || {};
  const correlationMatrix = visualizationData?.correlation_matrix || {};

  // Prepare automatic chart recommendations
  const automaticCharts = useMemo(() => {
    const recommendations = [];

    // Numerical columns: histogram recommendations
    numericColumns.slice(0, 4).forEach((column) => {
      const values = chartData.map((row) => row[column]);

      recommendations.push({
        id: `histogram-${column}`,
        title: `${column} Distribution`,
        description: `Frequency distribution of ${column}.`,
        type: "histogram",
        column,
        data: makeHistogram(values),
      });
    });

    // Categorical columns: category frequency charts
    categoricalColumns.slice(0, 4).forEach((column) => {
      const data =
        categorySummaries[column]?.length > 0
          ? categorySummaries[column].map((item) => ({
              name: item.label,
              value: item.count,
            }))
          : buildCategoryData(chartData.map((row) => row[column]));

      if (data.length > 0) {
        recommendations.push({
          id: `category-${column}`,
          title: `${column} Breakdown`,
          description: `Most frequent categories in ${column}.`,
          type: "bar",
          column,
          data,
        });
      }
    });

    // Two numeric columns: scatter plot recommendation
    if (numericColumns.length >= 2) {
      const first = numericColumns[0];
      const second = numericColumns[1];

      const scatterData = chartData
        .map((row) => ({
          x: Number(row[first]),
          y: Number(row[second]),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.x) && Number.isFinite(item.y)
        );

      if (scatterData.length > 0) {
        recommendations.push({
          id: `scatter-${first}-${second}`,
          title: `${first} vs ${second}`,
          description: `Explore the relationship between ${first} and ${second}.`,
          type: "scatter",
          xColumn: first,
          yColumn: second,
          data: scatterData,
        });
      }
    }

    return recommendations;
  }, [
    chartData,
    numericColumns,
    categoricalColumns,
    categorySummaries,
  ]);

  // Prepare manual chart data with grouped analysis
  const manualChartData = useMemo(() => {
    if (!xColumn || !chartData.length) return [];

    if (chartType === "histogram") {
      return makeHistogram(chartData.map((row) => row[xColumn]));
    }

    if (chartType === "pie") {
      return buildCategoryData(chartData.map((row) => row[xColumn]));
    }

    if (chartType === "scatter") {
      if (!yColumn) return [];

      return chartData
        .map((row) => ({
          x: Number(row[xColumn]),
          y: Number(row[yColumn]),
        }))
        .filter(
          (item) => Number.isFinite(item.x) && Number.isFinite(item.y)
        );
    }

    if (chartType === "bar" || chartType === "line") {
      const groups = new Map();

      chartData.forEach((row) => {
        const rawLabel = row[xColumn];
        const label =
          rawLabel === null || rawLabel === undefined || rawLabel === ""
            ? "Missing"
            : String(rawLabel);

        if (!groups.has(label)) {
          groups.set(label, { values: [], count: 0 });
        }

        const group = groups.get(label);
        group.count += 1;

        if (aggregation !== "count" && yColumn) {
          const rawValue = row[yColumn];
          const value = Number(rawValue);

          if (
            rawValue !== null &&
            rawValue !== undefined &&
            rawValue !== "" &&
            Number.isFinite(value)
          ) {
            group.values.push(value);
          }
        }
      });

      return Array.from(groups.entries())
        .map(([name, group]) => {
          let value;

          if (aggregation === "count") {
            value = group.count;
          } else {
            const values = group.values;
            if (values.length === 0) return null;

            switch (aggregation) {
              case "sum":
                value = values.reduce((total, item) => total + item, 0);
                break;
              case "minimum":
                value = Math.min(...values);
                break;
              case "maximum":
                value = Math.max(...values);
                break;
              case "average":
              default:
                value =
                  values.reduce((total, item) => total + item, 0) /
                  values.length;
                break;
            }
          }

          return {
            name,
            value: Number(value.toFixed(2)),
            records: group.count,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value);
    }

    return [];
  }, [chartData, chartType, xColumn, yColumn, aggregation]);

  // Export the currently displayed Recharts SVG as a PNG image.
  const downloadChartAsPng = async () => {
    const svg = chartAreaRef.current?.querySelector("svg");

    if (!svg) {
      setExportMessage("There is no chart available to export.");
      return;
    }

    try {
      setExportingChart(true);
      setExportMessage("");

      const clonedSvg = svg.cloneNode(true);
      const bounds = svg.getBoundingClientRect();
      const width = Math.max(900, Math.ceil(bounds.width));
      const height = Math.max(550, Math.ceil(bounds.height));

      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));
      clonedSvg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);

      // Preserve the chart's visible text and line styling in the exported file.
      clonedSvg.querySelectorAll("text").forEach((node) => {
        const computed = window.getComputedStyle(svg.querySelector("text") || node);
        if (!node.getAttribute("fill")) {
          node.setAttribute("fill", computed.fill || "#333333");
        }
      });

      const svgMarkup = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgMarkup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Unable to create image canvas.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, bounds.width, bounds.height);

      URL.revokeObjectURL(objectUrl);

      const pngBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) throw new Error("PNG image could not be generated.");

      const downloadUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      const safeName = (selectedDataset?.filename || "datastory-chart")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9-_]+/gi, "-");
      link.href = downloadUrl;
      link.download = `${safeName}-${chartType}-chart.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setExportMessage("Chart downloaded successfully as PNG.");
    } catch (exportError) {
      console.error("Chart export failed:", exportError);
      setExportMessage("Unable to export this chart. Please try again.");
    } finally {
      setExportingChart(false);
    }
  };

  // Chart renderer
  const renderChart = (type, data, xLabel, yLabel) => {
    if (!data || data.length === 0) {
      return (
        <div className="visual-empty-chart">
          <BarChart3 size={30} />
          <p>No chart data available.</p>
        </div>
      );
    }

    if (type === "histogram") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="#303044" strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              stroke="#9293a8"
              tick={{ fontSize: 10 }}
              angle={-15}
              textAnchor="end"
              height={55}
            />
            <YAxis stroke="#9293a8" />
            <Tooltip
              contentStyle={{
                background: "#202031",
                border: "1px solid #45455c",
                borderRadius: 8,
                color: "#fff",
              }}
            />
            <Bar
              dataKey="count"
              fill="#9b7cf7"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="#303044" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              stroke="#9293a8"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={65}
            />
            <YAxis stroke="#9293a8" />
            <Tooltip
              contentStyle={{
                background: "#202031",
                border: "1px solid #45455c",
                borderRadius: 8,
                color: "#fff",
              }}
            />
            <Bar
              dataKey="value"
              fill="#8b5cf6"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid stroke="#303044" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              stroke="#9293a8"
              tick={{ fontSize: 10 }}
            />
            <YAxis stroke="#9293a8" />
            <Tooltip
              contentStyle={{
                background: "#202031",
                border: "1px solid #45455c",
                borderRadius: 8,
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ fill: "#38bdf8", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={105}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#202031",
                border: "1px solid #45455c",
                borderRadius: 8,
                color: "#fff",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === "scatter") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid stroke="#303044" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel || "X"}
              stroke="#9293a8"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel || "Y"}
              stroke="#9293a8"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "#202031",
                border: "1px solid #45455c",
                borderRadius: 8,
                color: "#fff",
              }}
            />
            <Scatter data={data} fill="#34d399" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  if (loadingDatasets) {
    return (
      <div className="visual-loading">
        <LoaderCircle className="visual-spinner" size={30} />
        <p>Loading datasets...</p>
      </div>
    );
  }

  return (
    <div className="visualizations-page">
      {/* Header */}
      <div className="visual-header">
        <div>
          <div className="visual-title-row">
            <div className="visual-title-icon">
              <BarChart3 size={24} />
            </div>

            <div>
              <h1>Visualizations</h1>
              <p>
                Turn your raw data into meaningful visual insights.
              </p>
            </div>
          </div>
        </div>

        <button
          className="visual-refresh-button"
          onClick={() =>
            selectedId
              ? loadVisualizations(selectedId)
              : loadDatasets()
          }
          disabled={loadingCharts}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Dataset Selector */}
      <div className="visual-dataset-selector">
        <div className="visual-selector-label">
          <Database size={21} />
          <div>
            <h3>Choose Dataset</h3>
            <p>Select the dataset you want to visualize.</p>
          </div>
        </div>

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

      {/* Error */}
      {error && (
        <div className="visual-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Empty Dataset */}
      {datasets.length === 0 && !error && (
        <div className="visual-empty">
          <Database size={45} />
          <h2>No datasets available</h2>
          <p>Upload a dataset before creating visualizations.</p>
        </div>
      )}

      {/* Loading */}
      {loadingCharts && (
        <div className="visual-loading">
          <LoaderCircle className="visual-spinner" size={30} />
          <p>Preparing your visualizations...</p>
        </div>
      )}

      {!loadingCharts && visualizationData && (
        <>
          {/* Selected dataset details */}
          <div className="visual-selected-dataset">
            <div>
              <span className="visual-file-icon">
                <Database size={20} />
              </span>
            </div>

            <div>
              <h3>{selectedDataset?.filename}</h3>
              <p>
                {visualizationData.total_records} total records ·{" "}
                {visualizationData.numeric_columns.length} numerical
                columns ·{" "}
                {visualizationData.categorical_columns.length} categorical
                columns
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="visual-section-navigation">
            <button
              className={
                activeSection === "automatic" ? "active" : ""
              }
              onClick={() => setActiveSection("automatic")}
            >
              <Sparkles size={17} />
              Auto Insights
            </button>

            <button
              className={
                activeSection === "builder" ? "active" : ""
              }
              onClick={() => setActiveSection("builder")}
            >
              <Settings2 size={17} />
              Chart Builder
            </button>

            <button
              className={
                activeSection === "correlation" ? "active" : ""
              }
              onClick={() => setActiveSection("correlation")}
            >
              <ScatterChartIcon size={17} />
              Correlation
            </button>
          </div>

          {/* AUTOMATIC CHARTS */}
          {activeSection === "automatic" && (
            <div className="visual-section-content">
              <div className="visual-section-heading">
                <div>
                  <h2>
                    <Sparkles size={20} />
                    Automatic Chart Recommendations
                  </h2>
                  <p>
                    Suggested visualizations generated from your dataset.
                  </p>
                </div>

                <span>{automaticCharts.length} recommendations</span>
              </div>

              {automaticCharts.length === 0 ? (
                <div className="visual-empty">
                  <BarChart3 size={40} />
                  <h3>No recommendations available</h3>
                  <p>
                    This dataset does not contain enough usable columns
                    for automatic chart recommendations.
                  </p>
                </div>
              ) : (
                <div className="visual-chart-grid">
                  {automaticCharts.map((chart) => (
                    <div className="visual-chart-card" key={chart.id}>
                      <div className="visual-chart-card-header">
                        <div>
                          <h3>{chart.title}</h3>
                          <p>{chart.description}</p>
                        </div>

                        <span className="visual-chart-tag">
                          {chart.type}
                        </span>
                      </div>

                      <div className="visual-chart-area">
                        {renderChart(
                          chart.type,
                          chart.data,
                          chart.xColumn,
                          chart.yColumn
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL CHART BUILDER */}
          {activeSection === "builder" && (
            <div className="visual-section-content">
              <div className="visual-section-heading">
                <div>
                  <h2>
                    <Settings2 size={20} />
                    Manual Chart Builder
                  </h2>
                  <p>
                    Choose your preferred chart and columns.
                  </p>
                </div>
              </div>

              <div className="visual-builder-layout">
                <div className="visual-builder-controls">
                  <div className="visual-control-group">
                    <label>Chart Type</label>

                    <div className="visual-chart-type-grid">
                      {CHART_TYPES.map((type) => {
                        const Icon = type.icon;

                        return (
                          <button
                            key={type.value}
                            className={
                              chartType === type.value ? "selected" : ""
                            }
                            onClick={() => setChartType(type.value)}
                          >
                            <Icon size={18} />
                            <span>{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="visual-control-group">
                    <label>
                      {chartType === "histogram" || chartType === "pie"
                        ? "Select Column"
                        : "X-Axis Column"}
                    </label>

                    <select
                      value={xColumn}
                      onChange={(event) => setXColumn(event.target.value)}
                    >
                      <option value="">Select column</option>

                      {[
                        ...categoricalColumns,
                        ...numericColumns,
                      ].map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(chartType === "bar" || chartType === "line") && (
  <div className="visual-control-group">
    <label>Aggregation Method</label>

    <select
      value={aggregation}
      onChange={(event) =>
        setAggregation(event.target.value)
      }
    >
      <option value="average">Average</option>
      <option value="sum">Sum</option>
      <option value="count">Count</option>
      <option value="minimum">Minimum</option>
      <option value="maximum">Maximum</option>
    </select>

    <p className="visual-control-description">
      Group records by your X-axis column and calculate
      the selected value.
    </p>
  </div>
)}

                  {(chartType === "bar" ||
                    chartType === "line" ||
                    chartType === "scatter") && (
                    <div className="visual-control-group">
                      <label>Y-Axis Column</label>

                      <select
                        value={yColumn}
                        onChange={(event) => setYColumn(event.target.value)}
                      >
                        <option value="">Select numerical column</option>

                        {numericColumns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="visual-builder-note">
                    <Sparkles size={16} />
                    <p>
                      Your chart is generated from the selected dataset.
                    </p>
                  </div>
                </div>

                <div className="visual-builder-preview">
                  <div className="visual-chart-card-header">
                    <div>
                      <h3>Chart Preview</h3>
                      <p>
                        {xColumn || "Select a column to begin"}
                        {chartType === "bar" || chartType === "line"
                            ? ` · ${
                                aggregation === "count"
                                    ? "Record Count"
                                    : `${aggregation} of ${yColumn || "Select Y-axis"}`
                             }`
                            : yColumn
                             ? ` vs ${yColumn}`
                             : ""}
                        </p>
                    </div>

                    <span className="visual-chart-tag">
                      {chartType}
                    </span>
                  </div>

                  <div className="visual-chart-export-row" style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center", margin: "12px 0" }}>
                    <button
                      type="button"
                      className="visual-refresh-button"
                      onClick={downloadChartAsPng}
                      disabled={exportingChart || manualChartData.length === 0}
                      title="Download the current chart as a PNG image"
                    >
                      <Download size={16} />
                      {exportingChart ? "Exporting..." : "Download PNG"}
                    </button>
                  </div>

                  {exportMessage && (
                    <p role="status" style={{ color: exportMessage.startsWith("Unable") || exportMessage.startsWith("There") ? "#fb7185" : "#34d399", fontSize: 12, margin: "0 0 10px" }}>
                      {exportMessage}
                    </p>
                  )}

                  <div className="visual-chart-area" ref={chartAreaRef}>
                    {xColumn &&
                    manualChartData.length > 0 &&
                    (chartType === "histogram" ||
                      chartType === "pie" ||
                      chartType !== "scatter" ||
                      yColumn) ? (
                      renderChart(
                        chartType,
                        manualChartData,
                        xColumn,
                        yColumn
                      )
                    ) : (
                      <div className="visual-empty-chart">
                        <ChartColumn size={35} />
                        <p>
                          Choose the required columns to preview your chart.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CORRELATION */}
          {activeSection === "correlation" && (
            <div className="visual-section-content">
              <div className="visual-section-heading">
                <div>
                  <h2>
                    <ScatterChartIcon size={20} />
                    Correlation Analysis
                  </h2>
                  <p>
                    Explore relationships between numerical columns.
                  </p>
                </div>
              </div>

              {Object.keys(correlationMatrix).length < 2 ? (
                <div className="visual-empty">
                  <ScatterChartIcon size={40} />
                  <h3>Not enough numerical columns</h3>
                  <p>
                    At least two numerical columns are needed for
                    correlation analysis.
                  </p>
                </div>
              ) : (
                <div className="visual-correlation-card">
                  <div className="visual-correlation-legend">
                    <span>Correlation values range from -1 to +1.</span>
                    <span>
                      +1 = Positive · 0 = No linear correlation · -1 =
                      Negative
                    </span>
                  </div>

                  <div className="visual-table-wrapper">
                    <table className="visual-correlation-table">
                      <thead>
                        <tr>
                          <th>Column</th>

                          {Object.keys(correlationMatrix).map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(correlationMatrix).map(
                          ([rowName, values]) => (
                            <tr key={rowName}>
                              <th>{rowName}</th>

                              {Object.keys(correlationMatrix).map(
                                (column) => {
                                  const value = values[column];

                                  const intensity =
                                    value === null
                                      ? 0
                                      : Math.abs(value);

                                  const background =
                                    value === null
                                      ? "rgba(120,120,140,0.12)"
                                      : value >= 0
                                        ? `rgba(52,211,153,${0.12 + intensity * 0.45})`
                                        : `rgba(251,113,133,${0.12 + intensity * 0.45})`;

                                  return (
                                    <td
                                      key={column}
                                      style={{ background }}
                                    >
                                      {value === null
                                        ? "—"
                                        : value.toFixed(3)}
                                    </td>
                                  );
                                }
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="visual-correlation-note">
                    Correlation measures linear association, not
                    causation. Correlations should be interpreted in
                    the context of the dataset.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Data information */}
          <div className="visual-footer-info">
            <Database size={16} />
            <span>
              Charts use up to {visualizationData.records_returned} records
              from a total of {visualizationData.total_records} records.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default Visualizations;