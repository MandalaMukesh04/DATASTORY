
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Plus, Eye, LayoutDashboard, BarChart3, Table2,
  Type, Hash, Trash2, Copy, Settings2, FilePlus, Grip, X,
  Database, LoaderCircle, RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { getDatasetDetails } from "../services/api";
import "./ManualReportBuilder.css";

const COLORS = ["#6559db", "#16a6a0", "#f3a64a", "#e36d91", "#638bdc", "#8a65bd"];

const componentOptions = [
  { type: "kpi", label: "KPI Card", icon: Hash },
  { type: "chart", label: "Chart", icon: BarChart3 },
  { type: "table", label: "Table", icon: Table2 },
  { type: "text", label: "Text Box", icon: Type },
];

const makeComponent = (type) => {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (type === "kpi") {
    return {
      id, type, title: "New KPI", column: "", calculation: "sum",
      value: "0", subtitle: "Calculated from dataset", width: "medium",
      accent: "#6559db"
    };
  }

  if (type === "chart") {
    return {
      id, type, title: "New Chart", chartType: "bar",
      categoryColumn: "", valueColumn: "", width: "medium"
    };
  }

  if (type === "table") {
    return {
      id, type, title: "Dataset Table", selectedColumns: [],
      rowLimit: 10, width: "full"
    };
  }

  return {
    id, type, title: "Text Section",
    content: "Write your report text here.", width: "full"
  };
};

function formatValue(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(Number(value));
}

function calculateKpi(rows, column, calculation) {
  if (calculation === "count") return rows.length;

  const values = rows
    .map((row) => Number(row[column]))
    .filter(Number.isFinite);

  if (!values.length) return null;

  switch (calculation) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "average":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "minimum":
      return Math.min(...values);
    case "maximum":
      return Math.max(...values);
    default:
      return null;
  }
}

function ChartRenderer({ component, rows }) {
  const { chartType, categoryColumn, valueColumn } = component;

  const chartData = useMemo(() => {
    if (!categoryColumn || !rows.length) return [];

    const groups = new Map();

    rows.forEach((row) => {
      const label = String(row[categoryColumn] ?? "Missing");
      const numericValue = Number(row[valueColumn]);

      if (chartType === "pie" || chartType === "donut") {
        groups.set(label, (groups.get(label) || 0) + 1);
      } else if (Number.isFinite(numericValue)) {
        groups.set(label, (groups.get(label) || 0) + numericValue);
      }
    });

    return Array.from(groups.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [rows, categoryColumn, valueColumn, chartType]);

  if (!categoryColumn) {
    return <div className="mrb-data-empty">Choose a category column in Properties.</div>;
  }

  if (!chartData.length) {
    return <div className="mrb-data-empty">No compatible data for this chart.</div>;
  }

  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        fontSize: 12
      }}
    />
  );

  if (chartType === "pie" || chartType === "donut") {
    return (
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={85}
            innerRadius={chartType === "donut" ? 52 : 0}
            paddingAngle={3}
          >
            {chartData.map((item, index) => (
              <Cell key={item.label} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          {tooltip}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={chartData}>
          <CartesianGrid stroke="#e9edf3" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          {tooltip}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6559db"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="#e9edf3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        {tooltip}
        <Bar dataKey="value" fill="#6559db" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ManualReportBuilder({
  reportTitle = "Untitled Report",
  datasetName = "Selected Dataset",
  datasetId,
  onBack
}) {
  const [title, setTitle] = useState(reportTitle);
  const [dataset, setDataset] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [pages, setPages] = useState([
    { id: "page-1", name: "Page 1", components: [] }
  ]);
  const [activePageId, setActivePageId] = useState("page-1");
  const [selectedId, setSelectedId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadingData(true);
        setDataError("");

        const response = await getDatasetDetails(datasetId);

        if (!cancelled) {
          setDataset(response);
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(
            error.response?.data?.detail ||
            "Unable to load dataset details. Please check the backend."
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    if (datasetId) {
      loadData();
    } else {
      setDataError("No dataset was selected.");
      setLoadingData(false);
    }

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const columns = dataset?.profile?.columns || dataset?.preview?.columns || [];
  const rows = dataset?.preview?.rows || [];
  const numericColumns = columns.filter((column) =>
    rows.some((row) =>
      row[column] !== null &&
      row[column] !== "" &&
      Number.isFinite(Number(row[column]))
    )
  );
  const categoricalColumns = columns.filter(
    (column) => !numericColumns.includes(column)
  );

  const activePage = pages.find((page) => page.id === activePageId);
  const components = activePage?.components || [];
  const selectedComponent = components.find(
    (component) => component.id === selectedId
  );

  const updateComponents = (updater) => {
    setPages((previous) =>
      previous.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              components: typeof updater === "function"
                ? updater(page.components)
                : updater
            }
          : page
      )
    );
  };

  const addComponent = (type) => {
    const component = makeComponent(type);

    if (type === "kpi") {
      component.column = numericColumns[0] || "";
    }

    if (type === "chart") {
      component.categoryColumn = categoricalColumns[0] || columns[0] || "";
      component.valueColumn = numericColumns[0] || "";
    }

    if (type === "table") {
      component.selectedColumns = columns.slice(0, Math.min(5, columns.length));
    }

    updateComponents((previous) => [...previous, component]);
    setSelectedId(component.id);
  };

  const updateComponent = (field, value) => {
    updateComponents((previous) =>
      previous.map((component) =>
        component.id === selectedId
          ? { ...component, [field]: value }
          : component
      )
    );
  };

  const deleteComponent = (id = selectedId) => {
    updateComponents((previous) =>
      previous.filter((component) => component.id !== id)
    );
    setSelectedId(null);
  };

  const duplicateComponent = () => {
    if (!selectedComponent) return;
    const duplicate = {
      ...selectedComponent,
      id: `${selectedComponent.type}-${Date.now()}`,
      title: `${selectedComponent.title} Copy`
    };
    updateComponents((previous) => [...previous, duplicate]);
    setSelectedId(duplicate.id);
  };

  const addPage = () => {
    const page = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      components: []
    };
    setPages((previous) => [...previous, page]);
    setActivePageId(page.id);
    setSelectedId(null);
  };

  const updatePageName = (value) => {
    setPages((previous) =>
      previous.map((page) =>
        page.id === activePageId ? { ...page, name: value } : page
      )
    );
  };

  const toggleTableColumn = (column) => {
    const selected = selectedComponent?.selectedColumns || [];
    const next = selected.includes(column)
      ? selected.filter((item) => item !== column)
      : [...selected, column];

    updateComponent("selectedColumns", next);
  };

  const renderComponent = (component) => {
    if (component.type === "kpi") {
      const value = calculateKpi(rows, component.column, component.calculation);

      return (
        <div
          className="mrb-kpi-content"
          style={{ borderTopColor: component.accent }}
        >
          <span>{component.title}</span>
          <strong>{formatValue(value)}</strong>
          <small>
            {component.calculation.toUpperCase()}
            {component.calculation !== "count" ? ` · ${component.column || "Choose a column"}` : " · Dataset preview rows"}
          </small>
        </div>
      );
    }

    if (component.type === "chart") {
      return <ChartRenderer component={component} rows={rows} />;
    }

    if (component.type === "table") {
      const selectedColumns = component.selectedColumns || [];
      const tableRows = rows.slice(0, Number(component.rowLimit) || 10);

      return (
        <div className="mrb-live-table-wrap">
          <table className="mrb-live-table">
            <thead>
              <tr>
                {selectedColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={index}>
                  {selectedColumns.map((column) => (
                    <td key={column}>{String(row[column] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > tableRows.length && (
            <small className="mrb-table-count">
              Showing {tableRows.length} of {rows.length} preview rows
            </small>
          )}
        </div>
      );
    }

    return <p className="mrb-text-content">{component.content}</p>;
  };

  return (
    <div className={`mrb-workspace ${previewMode ? "mrb-preview-mode" : ""}`}>
      <header className="mrb-toolbar">
        <div className="mrb-toolbar-left">
          <button className="mrb-icon-button" onClick={onBack} title="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="mrb-brand">
            <div className="mrb-brand-icon"><LayoutDashboard size={18} /></div>
            <div><strong>DATASTORY</strong><small>MANUAL REPORT BUILDER</small></div>
          </div>
          <div className="mrb-toolbar-divider" />
          <input
            className="mrb-report-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Report title"
          />
        </div>
        <div className="mrb-toolbar-right">
          <span className="mrb-save-status">
            {rows.length} preview rows · {columns.length} columns
          </span>
          <button
            className="mrb-preview-button"
            onClick={() => setPreviewMode((previous) => !previous)}
          >
            <Eye size={16} /> {previewMode ? "Edit Report" : "Preview"}
          </button>
        </div>
      </header>

      <div className="mrb-editor-layout">
        {!previewMode && (
          <aside className="mrb-tool-panel">
            <div className="mrb-panel-heading">
              <div><strong>Build your report</strong><small>Add components to your canvas</small></div>
            </div>

            <div className="mrb-tool-section">
              <span className="mrb-section-label">COMPONENTS</span>
              <div className="mrb-component-list">
                {componentOptions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      className="mrb-component-button"
                      onClick={() => addComponent(item.type)}
                      disabled={loadingData || !!dataError}
                    >
                      <span><Icon size={18} /></span>
                      {item.label}
                      <Plus size={15} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mrb-dataset-info">
              <span className="mrb-section-label">CONNECTED DATASET</span>
              <div className="mrb-dataset-card">
                <Database size={18} />
                <div><strong>{datasetName}</strong><small>{rows.length} preview rows · {columns.length} columns</small></div>
              </div>
              {loadingData && <p className="mrb-data-status"><LoaderCircle size={14} /> Loading dataset...</p>}
              {dataError && <p className="mrb-data-error">{dataError}</p>}
              {!loadingData && !dataError && (
                <p className="mrb-data-status"><RefreshCw size={13} /> Dataset connected</p>
              )}
            </div>
          </aside>
        )}

        <main className="mrb-main-area">
          <div className="mrb-canvas-topbar">
            <div><span>REPORT CANVAS</span><strong>{activePage?.name}</strong></div>
            <span className="mrb-canvas-size">16:9 REPORT WORKSPACE</span>
          </div>

          <div className="mrb-canvas-scroll">
            <section
              className="mrb-report-canvas"
              onClick={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null);
              }}
            >
              <div className="mrb-report-heading">
                <span>DATASTORY ANALYTICS</span>
                <h1>{title}</h1>
                <p>{datasetName}</p>
              </div>

              {loadingData ? (
                <div className="mrb-empty-canvas">
                  <LoaderCircle size={28} className="mrb-loader" />
                  <h2>Loading your dataset</h2>
                </div>
              ) : dataError ? (
                <div className="mrb-empty-canvas">
                  <Database size={28} />
                  <h2>Dataset unavailable</h2>
                  <p>{dataError}</p>
                </div>
              ) : components.length === 0 ? (
                <div className="mrb-empty-canvas">
                  <div><Plus size={25} /></div>
                  <h2>Your report starts here</h2>
                  <p>Add a KPI, chart, table or text component from the left panel.</p>
                </div>
              ) : (
                <div className="mrb-component-grid">
                  {components.map((component) => (
                    <div
                      key={component.id}
                      className={`mrb-canvas-component mrb-${component.width || "medium"} ${
                        selectedId === component.id ? "selected" : ""
                      }`}
                      onClick={() => {
                        if (!previewMode) setSelectedId(component.id);
                      }}
                    >
                      {!previewMode && (
                        <div className="mrb-component-controls">
                          <Grip size={14} />
                          <span>{component.type.toUpperCase()}</span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteComponent(component.id);
                            }}
                            title="Delete component"
                          ><X size={14} /></button>
                        </div>
                      )}
                      {renderComponent(component)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="mrb-page-navigation">
            <div className="mrb-page-tabs">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  className={activePageId === page.id ? "active" : ""}
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedId(null);
                  }}
                >{index + 1}. {page.name}</button>
              ))}
            </div>
            {!previewMode && (
              <button className="mrb-add-page" onClick={addPage}>
                <FilePlus size={16} /> Add Page
              </button>
            )}
          </div>
        </main>

        {!previewMode && (
          <aside className="mrb-properties-panel">
            <div className="mrb-panel-heading">
              <div><strong>Properties</strong><small>Customize your selection</small></div>
              <Settings2 size={18} />
            </div>

            {selectedComponent ? (
              <div className="mrb-property-fields">
                <span className="mrb-section-label">{selectedComponent.type.toUpperCase()} SETTINGS</span>

                <label>Component title
                  <input
                    value={selectedComponent.title}
                    onChange={(event) => updateComponent("title", event.target.value)}
                  />
                </label>

                {selectedComponent.type === "kpi" && (
                  <>
                    <label>Calculation
                      <select
                        value={selectedComponent.calculation}
                        onChange={(event) => updateComponent("calculation", event.target.value)}
                      >
                        <option value="sum">Sum</option>
                        <option value="average">Average</option>
                        <option value="count">Count records</option>
                        <option value="minimum">Minimum</option>
                        <option value="maximum">Maximum</option>
                      </select>
                    </label>
                    {selectedComponent.calculation !== "count" && (
                      <label>Numeric column
                        <select
                          value={selectedComponent.column}
                          onChange={(event) => updateComponent("column", event.target.value)}
                        >
                          <option value="">Select a column</option>
                          {numericColumns.map((column) => <option key={column}>{column}</option>)}
                        </select>
                      </label>
                    )}
                    <label>Accent color
                      <input
                        type="color"
                        value={selectedComponent.accent}
                        onChange={(event) => updateComponent("accent", event.target.value)}
                      />
                    </label>
                  </>
                )}

                {selectedComponent.type === "chart" && (
                  <>
                    <label>Chart type
                      <select
                        value={selectedComponent.chartType}
                        onChange={(event) => updateComponent("chartType", event.target.value)}
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="donut">Donut Chart</option>
                      </select>
                    </label>
                    <label>Category column
                      <select
                        value={selectedComponent.categoryColumn}
                        onChange={(event) => updateComponent("categoryColumn", event.target.value)}
                      >
                        <option value="">Select a category</option>
                        {columns.map((column) => <option key={column}>{column}</option>)}
                      </select>
                    </label>
                    {selectedComponent.chartType === "bar" || selectedComponent.chartType === "line" ? (
                      <label>Numeric value column
                        <select
                          value={selectedComponent.valueColumn}
                          onChange={(event) => updateComponent("valueColumn", event.target.value)}
                        >
                          <option value="">Select a numeric column</option>
                          {numericColumns.map((column) => <option key={column}>{column}</option>)}
                        </select>
                      </label>
                    ) : (
                      <p className="mrb-property-note">Pie and donut charts show the record count for each category.</p>
                    )}
                  </>
                )}

                {selectedComponent.type === "table" && (
                  <>
                    <label>Rows to display
                      <select
                        value={selectedComponent.rowLimit}
                        onChange={(event) => updateComponent("rowLimit", Number(event.target.value))}
                      >
                        <option value={5}>5 rows</option>
                        <option value={10}>10 rows</option>
                        <option value={20}>20 rows</option>
                        <option value={50}>50 rows</option>
                      </select>
                    </label>
                    <span className="mrb-section-label">VISIBLE COLUMNS</span>
                    <div className="mrb-column-checklist">
                      {columns.map((column) => (
                        <label key={column}>
                          <input
                            type="checkbox"
                            checked={(selectedComponent.selectedColumns || []).includes(column)}
                            onChange={() => toggleTableColumn(column)}
                          />
                          {column}
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {selectedComponent.type === "text" && (
                  <label>Text content
                    <textarea
                      rows="6"
                      value={selectedComponent.content}
                      onChange={(event) => updateComponent("content", event.target.value)}
                    />
                  </label>
                )}

                <label>Component width
                  <select
                    value={selectedComponent.width}
                    onChange={(event) => updateComponent("width", event.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="full">Full width</option>
                  </select>
                </label>

                <div className="mrb-property-actions">
                  <button onClick={duplicateComponent}><Copy size={15} /> Duplicate</button>
                  <button className="danger" onClick={deleteComponent}><Trash2 size={15} /> Delete</button>
                </div>
              </div>
            ) : (
              <div className="mrb-no-selection">
                <Settings2 size={28} />
                <strong>No component selected</strong>
                <p>Select a component on the canvas to edit its properties.</p>
              </div>
            )}

            <div className="mrb-page-settings">
              <span className="mrb-section-label">PAGE SETTINGS</span>
              <label>Page name
                <input
                  value={activePage?.name || ""}
                  onChange={(event) => updatePageName(event.target.value)}
                />
              </label>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default ManualReportBuilder;
