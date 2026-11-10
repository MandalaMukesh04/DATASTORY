
import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Presentation,
  FileBarChart,
  Database,
  ArrowRight,
  ChevronDown,
  BriefcaseBusiness,
  TrendingUp,
  GraduationCap,
  ShoppingCart,
  Users,
  BarChart3,
  Palette,
  Check,
  LoaderCircle,
  AlertCircle,
  FileText,
  Layers3,
  WandSparkles,
  PencilRuler,
  ChevronLeft,
  RefreshCw,
  Download,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

import { getDatasets, generateAIReport } from "../services/api";
import "./ReportStudio.css";
import ManualReportBuilder from "./ManualReportBuilder";

const reportTypes = [
  {
    id: "business",
    title: "Business Performance",
    description: "Revenue, growth, KPIs and business performance.",
    icon: BriefcaseBusiness,
  },
  {
    id: "sales",
    title: "Sales Analysis",
    description: "Sales trends, product performance and comparisons.",
    icon: TrendingUp,
  },
  {
    id: "marketing",
    title: "Marketing Analytics",
    description: "Campaign performance, customer behaviour and reach.",
    icon: Users,
  },
  {
    id: "financial",
    title: "Financial Report",
    description: "Financial summaries, costs and profitability.",
    icon: BarChart3,
  },
  {
    id: "ecommerce",
    title: "E-commerce Analytics",
    description: "Orders, products, customers and shopping trends.",
    icon: ShoppingCart,
  },
  {
    id: "academic",
    title: "Data Analysis Report",
    description: "Statistical summaries and analytical findings.",
    icon: GraduationCap,
  },
];

const templates = [
  {
    id: "executive",
    name: "Executive Dashboard",
    description: "KPI-focused layout with charts and key findings.",
    tag: "Popular",
    preview: "executive",
  },
  {
    id: "analytical",
    name: "Analytical Report",
    description: "Detailed analysis with multiple charts and tables.",
    tag: "Detailed",
    preview: "analytical",
  },
  {
    id: "minimal",
    name: "Minimal Report",
    description: "Clean, simple and presentation-ready design.",
    tag: "Clean",
    preview: "minimal",
  },
];

const CHART_COLORS = [
  "#9580ff",
  "#5bc6d8",
  "#f4b86a",
  "#6fdda5",
  "#ef88b8",
  "#8ca8ff",
  "#c1a3ff",
  "#f08e82",
];

function formatNumber(value) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value !== "number") return String(value);
  if (!Number.isFinite(value)) return "N/A";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function HistogramChart({ chart }) {
  const rawValues = (chart.data || [])
    .map((item) => Number(item.value))
    .filter(Number.isFinite);

  if (rawValues.length === 0) {
    return <p className="rs-chart-empty">No numeric data available.</p>;
  }

  const minimum = Math.min(...rawValues);
  const maximum = Math.max(...rawValues);
  const binCount = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(rawValues.length))));
  const binWidth = maximum === minimum ? 1 : (maximum - minimum) / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => ({
    label: (minimum + index * binWidth).toFixed(1),
    count: 0,
  }));

  rawValues.forEach((value) => {
    const index = Math.min(
      Math.floor((value - minimum) / binWidth),
      binCount - 1
    );
    bins[index].count += 1;
  });

  return (
    <ResponsiveContainer width="100%" height={255}>
      <BarChart data={bins} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid stroke="#303249" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke="#9da0b7" tick={{ fontSize: 10 }} />
        <YAxis stroke="#9da0b7" tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#24263b",
            border: "1px solid #44465e",
            borderRadius: 8,
            color: "#fff",
          }}
        />
        <Bar dataKey="count" name="Records" fill="#9580ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}


function ReportChart({ chart }) {
  const data = chart.data || [];

  const commonTooltip = (
    <Tooltip
      contentStyle={{
        background: "#ffffff",
        border: "1px solid #e1e5ed",
        borderRadius: 8,
        color: "#243047",
        fontSize: 12,
      }}
    />
  );

  if (chart.visual_type === "histogram") {
    const values = data.filter(Number.isFinite);

    if (!values.length) return <p>No numerical data available.</p>;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = 8;
    const width = max === min ? 1 : (max - min) / count;

    const bins = Array.from({ length: count }, (_, index) => ({
      label: (min + index * width).toFixed(1),
      frequency: 0,
    }));

    values.forEach((value) => {
      const index = Math.min(
        Math.floor((value - min) / width),
        count - 1
      );
      bins[index].frequency++;
    });

    return (
      <ResponsiveContainer width="100%" height={245}>
        <BarChart data={bins}>
          <CartesianGrid stroke="#e9edf3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          {commonTooltip}
          <Bar
            dataKey="frequency"
            name="Frequency"
            fill="#16a6a0"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart.visual_type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={245}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 15, right: 20 }}
        >
          <CartesianGrid stroke="#e9edf3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={95}
            tick={{ fontSize: 10 }}
          />
          {commonTooltip}
          <Bar
            dataKey="value"
            name={chart.value_column || "Value"}
            fill="#159e9a"
            radius={[0, 5, 5, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart.visual_type === "donut") {
    return (
      <ResponsiveContainer width="100%" height={245}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="48%"
            innerRadius={57}
            outerRadius={88}
            paddingAngle={3}
          >
            {data.map((item, index) => (
              <Cell
                key={`${item.label}-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          {commonTooltip}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.visual_type === "line") {
    return (
      <ResponsiveContainer width="100%" height={245}>
        <LineChart data={data}>
          <CartesianGrid stroke="#e9edf3" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          {commonTooltip}
          <Line
            type="monotone"
            dataKey="value"
            name={chart.value_column || "Value"}
            stroke="#159e9a"
            strokeWidth={3}
            dot={{ r: 3, fill: "#159e9a" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart.visual_type === "correlation") {
    const columns = chart.columns || [];

    return (
      <div className="rs-pbi-table-scroll">
        <table className="rs-pbi-correlation">
          <thead>
            <tr>
              <th>Column</th>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={row.column}>
                <th>{row.column}</th>
                {(row.values || []).map((value, columnIndex) => (
                  <td
                    key={columnIndex}
                    style={{
                      background:
                        typeof value === "number"
                          ? `rgba(22,166,160,${Math.abs(value) * 0.3})`
                          : "#f3f5f8",
                    }}
                  >
                    {typeof value === "number" ? value.toFixed(2) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="rs-pbi-empty">No preview available for this chart.</p>;
}



function AIReportPreview({
  reportResponse,
  onBack,
  onRegenerate,
  generating,
}) {
  const report = reportResponse.report;
  const layout = report.report_layout || {};
  const kpis = layout.kpis || report.kpis || [];
  const visuals = layout.visuals || [];
  const pages = layout.pages || [];

  const [activePage, setActivePage] = useState(
    pages[0]?.page_id || "executive_overview"
  );

  const currentPage = pages.find(
    (page) => page.page_id === activePage
  );

  const isExecutive = activePage === "executive_overview";
  const isDetails = activePage === "detailed_analysis";
  const isInsights = activePage === "insights";

  const visibleVisuals = isExecutive
    ? visuals.slice(0, 4)
    : isDetails
      ? visuals
      : [];

  const findings = report.findings || [];
  const recommendations = report.recommendations || [];

  return (
    <div className="rs-pbi-workspace">

      {/* REPORT TOOLBAR */}

      <div className="rs-pbi-toolbar">
        <button type="button" onClick={onBack} className="rs-pbi-back">
          <ChevronLeft size={17} />
          Report Studio
        </button>

        <div className="rs-pbi-toolbar-title">
          <Presentation size={18} />
          <span>{report.report_title}</span>
        </div>

        <div className="rs-pbi-toolbar-actions">
          <span className="rs-pbi-ready">
            <span></span> Generated
          </span>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="rs-pbi-regenerate"
          >
            {generating ? (
              <LoaderCircle size={15} className="rs-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Regenerate
          </button>
        </div>
      </div>

      {/* REPORT BODY */}

      <div className="rs-pbi-layout">

        {/* PAGE NAVIGATION */}

        <aside className="rs-pbi-sidebar">
          <div className="rs-pbi-sidebar-heading">
            <Layers3 size={16} />
            <span>REPORT PAGES</span>
          </div>

          {pages.map((page, index) => (
            <button
              type="button"
              key={page.page_id}
              className={`rs-pbi-page-button ${
                activePage === page.page_id ? "active" : ""
              }`}
              onClick={() => setActivePage(page.page_id)}
            >
              <span className="rs-pbi-page-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span>{page.title}</span>
            </button>
          ))}

          <div className="rs-pbi-sidebar-note">
            <Sparkles size={16} />
            <p>
              Automatically organized using your dataset's
              detected structure.
            </p>
          </div>
        </aside>

        {/* REPORT CANVAS */}

        <main className="rs-pbi-canvas">

          <div className="rs-pbi-report-header">
            <div>
              <span>DATASTORY BUSINESS INTELLIGENCE</span>
              <h1>{currentPage?.title || "Executive Overview"}</h1>
              <p>
                {currentPage?.description ||
                  "A summary of your selected dataset."}
              </p>
            </div>

            <div className="rs-pbi-dataset-badge">
              <Database size={15} />
              {reportResponse.dataset_name}
            </div>
          </div>

          {/* EXECUTIVE PAGE */}

          {isExecutive && (
            <>
              <div className="rs-pbi-section-heading">
                <h2>Key Performance Indicators</h2>
                <span>{kpis.length} metrics</span>
              </div>

              <div className="rs-pbi-kpi-grid">
                {kpis.slice(0, 6).map((kpi, index) => (
                  <div
                    className="rs-pbi-kpi-card"
                    key={kpi.id || `${kpi.title}-${index}`}
                  >
                    <div className="rs-pbi-kpi-top">
                      <span>{kpi.title}</span>
                      <div className={`rs-pbi-kpi-icon icon-${index % 4}`}>
                        {index === 0 ? (
                          <Database size={17} />
                        ) : index === 1 ? (
                          <BarChart3 size={17} />
                        ) : index === 2 ? (
                          <TrendingUp size={17} />
                        ) : (
                          <Layers3 size={17} />
                        )}
                      </div>
                    </div>

                    <strong>
                      {formatNumber(kpi.value)}
                    </strong>

                    <small>{kpi.description}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CHARTS */}

          {(isExecutive || isDetails) && (
            <>
              <div className="rs-pbi-section-heading">
                <div>
                  <h2>
                    {isExecutive
                      ? "Business Performance Overview"
                      : "Detailed Data Analysis"}
                  </h2>
                  <p>
                    Visualizations generated from calculated dataset values.
                  </p>
                </div>
                <span>{visibleVisuals.length} charts</span>
              </div>

              <div className="rs-pbi-chart-grid">
                {visibleVisuals.map((chart) => (
                  <div
                    className="rs-pbi-chart-card"
                    key={chart.id}
                  >
                    <div className="rs-pbi-chart-header">
                      <div>
                        <h3>{chart.title}</h3>
                        <p>
                          {chart.category_column
                            ? `Category: ${chart.category_column}`
                            : chart.value_column
                              ? `Measure: ${chart.value_column}`
                              : "Dataset analysis"}
                        </p>
                      </div>

                      <span>{chart.visual_type}</span>
                    </div>

                    <ReportChart chart={chart} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* INSIGHTS PAGE */}

          {isInsights && (
            <>
              <div className="rs-pbi-section-heading">
                <div>
                  <h2>Key Findings</h2>
                  <p>Observations calculated from your dataset.</p>
                </div>
                <span>{findings.length} findings</span>
              </div>

              <div className="rs-pbi-insights-grid">
                {findings.map((finding, index) => (
                  <div className="rs-pbi-insight-card" key={index}>
                    <div className="rs-pbi-insight-top">
                      <Lightbulb size={17} />
                      <span>{finding.category}</span>
                      <small>{finding.importance}</small>
                    </div>

                    <h3>{finding.title}</h3>
                    <p>{finding.description}</p>
                  </div>
                ))}
              </div>

              <div className="rs-pbi-section-heading">
                <div>
                  <h2>Recommendations</h2>
                  <p>Suggested next steps from the analysis.</p>
                </div>
              </div>

              <div className="rs-pbi-recommendations">
                {recommendations.map((item, index) => (
                  <div className="rs-pbi-recommendation" key={index}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <small>{item.priority}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="rs-pbi-footer">
            <span>Generated by DATASTORY</span>
            <span>
              {report.generated_at
                ? new Date(report.generated_at).toLocaleString()
                : ""}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}


function ReportStudio() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportResponse, setReportResponse] = useState(null);

  const [mode, setMode] = useState("ai");
  const [reportType, setReportType] = useState("business");
  const [template, setTemplate] = useState("executive");
  const [reportTitle, setReportTitle] = useState("");
  const [currentStep, setCurrentStep] = useState("setup");

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setLoading(true);
        const response = await getDatasets();
        const available = response.datasets || [];
        setDatasets(available);

        if (available.length > 0) {
          setSelectedDataset(available[0].dataset_id);
        }
      } catch (err) {
        setError("Unable to load datasets. Check your backend connection.");
      } finally {
        setLoading(false);
      }
    };

    loadDatasets();
  }, []);

  const selectedDatasetInfo = datasets.find(
    (dataset) => dataset.dataset_id === selectedDataset
  );

  const selectedTemplate = templates.find((item) => item.id === template);

  const resolvedTitle =
    reportTitle.trim() ||
    `${reportTypes.find((item) => item.id === reportType)?.title || "Data Analysis"} Report`;

  const handleContinue = async () => {
    if (!selectedDataset) {
      setError("Please select a dataset.");
      return;
    }

    setError("");

    if (mode === "manual") {
      setCurrentStep("manual");
      return;
    }

    await handleGenerateReport();
  };

  const handleGenerateReport = async () => {
    if (!selectedDataset) return;

    try {
      setGenerating(true);
      setError("");

      const response = await generateAIReport(
        selectedDataset,
        resolvedTitle,
        reportType
      );

      setReportResponse(response);
      setCurrentStep("preview");
    } catch (err) {
      console.error("AI report generation failed:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to generate the report. Check your backend and try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="rs-loading">
        <LoaderCircle size={30} className="rs-spin" />
        <p>Preparing your Report Studio...</p>
      </div>
    );
  }

  if (currentStep === "preview" && reportResponse) {
    return (
      <AIReportPreview
        reportResponse={reportResponse}
        template={template}
        onBack={() => setCurrentStep("setup")}
        onRegenerate={handleGenerateReport}
        generating={generating}
      />
    );
  }

  if (currentStep === "manual") {
  return (
    <ManualReportBuilder
      reportTitle={resolvedTitle}
      datasetName={selectedDatasetInfo?.filename || "Selected Dataset"}
      datasetId={selectedDataset}
      onBack={() => setCurrentStep("setup")}
    />
  );
}

  return (
    <div className="report-studio">
      <div className="rs-header">
        <div>
          <div className="rs-breadcrumb">
            <span>DATASTORY</span><span>/</span><span>Report Studio</span>
          </div>

          <div className="rs-title-row">
            <div className="rs-title-icon">
              <Presentation size={25} />
            </div>
            <div>
              <h1>Report Studio</h1>
              <p>Turn your data into beautiful, interactive reports.</p>
            </div>
          </div>
        </div>

        <div className="rs-header-status">
          <span className="rs-status-dot"></span>
          Report workspace ready
        </div>
      </div>

      <div className="rs-welcome-banner">
        <div className="rs-banner-content">
          <span className="rs-eyebrow">
            <Sparkles size={14} /> DATASTORY REPORT STUDIO
          </span>
          <h2>Your data deserves a better story.</h2>
          <p>
            Create professional reports with automated insights,
            visualizations and complete design control.
          </p>
          <div className="rs-banner-points">
            <span><Check size={15} /> Automated reporting</span>
            <span><Check size={15} /> Custom report layouts</span>
            <span><Check size={15} /> Interactive analytics</span>
          </div>
        </div>

        <div className="rs-banner-visual">
          <div className="rs-floating-card rs-floating-card-one">
            <div className="rs-floating-icon purple">
              <TrendingUp size={18} />
            </div>
            <div>
              <small>Performance</small>
              <strong>Data insights</strong>
            </div>
          </div>

          <div className="rs-report-preview">
            <div className="rs-preview-top">
              <span></span><span></span><span></span>
            </div>
            <div className="rs-preview-heading"></div>
            <div className="rs-preview-kpis">
              <span></span><span></span><span></span>
            </div>
            <div className="rs-preview-chart">
              <div className="rs-preview-bars">
                {[35, 55, 42, 76, 58, 92, 68].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }}></span>
                ))}
              </div>
            </div>
          </div>

          <div className="rs-floating-card rs-floating-card-two">
            <Sparkles size={17} />
            <span>AI Insights</span>
          </div>
        </div>
      </div>

      <div className="rs-section-heading">
        <div>
          <h2>How would you like to create?</h2>
          <p>Choose your preferred report creation experience.</p>
        </div>
        <span className="rs-step-label">STEP 01 / 03</span>
      </div>

      <div className="rs-mode-grid">
        {[
          {
            id: "ai",
            icon: WandSparkles,
            tag: "RECOMMENDED",
            title: "AI Report Generator",
            description:
              "Automatically analyze your dataset and generate a report with KPIs, charts and findings.",
            features: [
              "Automatic KPI calculations",
              "Recommended visualizations",
              "Data-backed insights",
            ],
          },
          {
            id: "manual",
            icon: PencilRuler,
            tag: "FULL CONTROL",
            title: "Manual Report Builder",
            description:
              "Design your own report by arranging charts, KPI cards, tables and text sections.",
            features: [
              "Custom report structure",
              "Flexible visual layout",
              "Personalized design",
            ],
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              className={`rs-mode-card ${mode === item.id ? "active" : ""}`}
              onClick={() => setMode(item.id)}
            >
              <div className="rs-mode-top">
                <div className={`rs-mode-icon ${item.id}`}>
                  <Icon size={24} />
                </div>
                <span className="rs-radio-indicator">
                  {mode === item.id && <Check size={13} />}
                </span>
              </div>

              <span className="rs-mode-tag">{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <div className="rs-mode-features">
                {item.features.map((feature) => (
                  <span key={feature}>
                    <Check size={14} /> {feature}
                  </span>
                ))}
              </div>

              <div className="rs-mode-action">
                Select {item.title} <ArrowRight size={16} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="rs-configuration">
        <div className="rs-section-heading">
          <div>
            <h2>Configure your report</h2>
            <p>Choose the dataset, report purpose and design.</p>
          </div>
          <span className="rs-step-label">STEP 02 / 03</span>
        </div>

        <div className="rs-config-card">
          <div className="rs-field">
            <label><Database size={16} /> Select dataset</label>

            {datasets.length > 0 ? (
              <div className="rs-select-wrapper">
                <select
                  value={selectedDataset}
                  onChange={(event) => setSelectedDataset(event.target.value)}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.filename}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} />
              </div>
            ) : (
              <div className="rs-empty-datasets">
                <Database size={23} />
                <div>
                  <strong>No datasets available</strong>
                  <p>Upload a dataset before creating a report.</p>
                </div>
              </div>
            )}

            {selectedDatasetInfo && (
              <div className="rs-dataset-meta">
                <span>{formatNumber(selectedDatasetInfo.total_rows)} rows</span>
                <span>{formatNumber(selectedDatasetInfo.total_columns)} columns</span>
                <span>{selectedDatasetInfo.file_type}</span>
              </div>
            )}
          </div>

          <div className="rs-field">
            <label><FileBarChart size={16} /> Report purpose</label>

            <div className="rs-report-type-grid">
              {reportTypes.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`rs-type-card ${reportType === item.id ? "selected" : ""}`}
                    onClick={() => setReportType(item.id)}
                  >
                    <Icon size={19} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    {reportType === item.id && (
                      <Check className="rs-type-check" size={17} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rs-field">
            <label><Palette size={16} /> Choose report template</label>

            <div className="rs-template-grid">
              {templates.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`rs-template-card ${template === item.id ? "selected" : ""}`}
                  onClick={() => setTemplate(item.id)}
                >
                  <div className={`rs-template-preview ${item.preview}`}>
                    <div className="rs-tp-header"></div>
                    <div className="rs-tp-kpis">
                      <span></span><span></span><span></span>
                    </div>
                    <div className="rs-tp-body">
                      <div className="rs-tp-chart"></div>
                      <div className="rs-tp-side">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>

                  <div className="rs-template-info">
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </div>
                    <span className="rs-template-tag">{item.tag}</span>
                  </div>

                  {template === item.id && (
                    <div className="rs-template-selected">
                      <Check size={13} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rs-field">
            <label><FileText size={16} /> Report title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
              placeholder="Enter a name for your report..."
            />
          </div>

          {error && (
            <div className="rs-error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <div className="rs-config-footer">
            <div className="rs-config-summary">
              <Layers3 size={17} />
              <span>
                {mode === "ai" ? "AI Report Generator" : "Manual Report Builder"}
                {" · "}
                {selectedTemplate?.name}
              </span>
            </div>

            <button
              type="button"
              className="rs-continue-btn"
              disabled={datasets.length === 0 || generating}
              onClick={handleContinue}
            >
              {generating ? (
                <>
                  <LoaderCircle size={17} className="rs-spin" />
                  Analyzing dataset...
                </>
              ) : (
                <>
                  {mode === "ai" ? "Generate AI Report" : "Continue to workspace"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportStudio;
