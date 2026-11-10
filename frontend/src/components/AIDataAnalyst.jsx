import { useEffect, useRef, useState } from "react";

import {
  Sparkles,
  Send,
  Bot,
  User,
  Database,
  LoaderCircle,
  MessageSquare,
  Trash2,
  Lightbulb,
  BarChart3,
  Download,
  AlertCircle
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

import {
  getDatasets,
  askDatasetQuestion,
  generateDatasetChart
} from "../services/api";

import "./AIDataAnalyst.css";


/* --------------------------------------------------
   DETECT CHART-RELATED QUESTIONS
-------------------------------------------------- */

const isChartRequest = (question) => {
  const text = question.toLowerCase().trim();

  const chartPhrases = [
    "chart",
    "charts",
    "graph",
    "graphs",
    "plot",
    "visualize",
    "visualise",
    "histogram",
    "scatter",
    "line chart",
    "bar chart",
    "pie chart",
    "distribution",
    "trend",
    "compare",
    "comparison",
    "show average",
    "show total",
    "show count",
    "show maximum",
    "show minimum"
  ];

  if (chartPhrases.some((phrase) => text.includes(phrase))) {
    return true;
  }

  // Examples:
  // Average Salary by Department
  // Total Sales by Region
  const hasGrouping = /\b(by|per|across)\b/.test(text);

  const hasVisualAction = /\b(show|display|visualize|visualise|plot)\b/.test(
    text
  );

  return hasGrouping && hasVisualAction;
};


/* --------------------------------------------------
   PNG EXPORT
-------------------------------------------------- */

const downloadChartAsPNG = async (chartElement, title) => {
  if (!chartElement) {
    return;
  }

  const svg = chartElement.querySelector("svg");

  if (!svg) {
    alert("Unable to find the chart. Please try again.");
    return;
  }

  try {
    const clonedSvg = svg.cloneNode(true);

    const originalWidth =
      svg.getBoundingClientRect().width || 800;

    const originalHeight =
      svg.getBoundingClientRect().height || 350;

    clonedSvg.setAttribute("width", originalWidth);
    clonedSvg.setAttribute("height", originalHeight);

    clonedSvg.setAttribute(
      "xmlns",
      "http://www.w3.org/2000/svg"
    );

    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );

    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#191a2a");

    clonedSvg.insertBefore(
      background,
      clonedSvg.firstChild
    );

    const serializer = new XMLSerializer();

    const svgText = serializer.serializeToString(clonedSvg);

    const svgBlob = new Blob(
      [svgText],
      { type: "image/svg+xml;charset=utf-8" }
    );

    const svgUrl = URL.createObjectURL(svgBlob);

    const image = new Image();

    image.onload = () => {
      const scale = 2;

      const canvas = document.createElement("canvas");

      canvas.width = originalWidth * scale;
      canvas.height = originalHeight * scale;

      const context = canvas.getContext("2d");

      context.scale(scale, scale);

      context.fillStyle = "#191a2a";
      context.fillRect(
        0,
        0,
        originalWidth,
        originalHeight
      );

      context.drawImage(
        image,
        0,
        0,
        originalWidth,
        originalHeight
      );

      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Unable to export this chart.");
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = downloadUrl;

        link.download =
          `${title.replace(/[^a-z0-9]/gi, "_")}.png`;

        link.click();

        URL.revokeObjectURL(downloadUrl);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      alert("Unable to export this chart.");
    };

    image.src = svgUrl;

  } catch (error) {
    console.error("Chart export error:", error);
    alert("Chart export failed. Please try again.");
  }
};


/* --------------------------------------------------
   CHART COMPONENT
-------------------------------------------------- */

function AIChartCard({ chart }) {
  const chartRef = useRef(null);

  const chartType = chart.chart_type;

  const chartData = chart.data || [];

  const xKey = chart.x_key;
  const yKey = chart.y_key;

  const hasData = chartData.length > 0;

  const renderChart = () => {
    if (!hasData) {
      return (
        <div className="ai-chart-empty">
          No chart data is available.
        </div>
      );
    }

    if (chartType === "scatter") {
      return (
        <ScatterChart
          data={chartData}
          margin={{
            top: 15,
            right: 25,
            bottom: 15,
            left: 5
          }}
        >
          <CartesianGrid stroke="#34354b" strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey={xKey}
            name={xKey}
            stroke="#a4a4ba"
            tick={{ fill: "#a4a4ba", fontSize: 11 }}
            label={{
              value: xKey,
              position: "insideBottom",
              offset: -8,
              fill: "#b5b5c9"
            }}
          />

          <YAxis
            type="number"
            dataKey={yKey}
            name={yKey}
            stroke="#a4a4ba"
            tick={{ fill: "#a4a4ba", fontSize: 11 }}
          />

          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#24243a",
              border: "1px solid #46415f",
              borderRadius: "9px",
              color: "#ffffff"
            }}
          />

          <Scatter
            name={chart.title}
            data={chartData}
            fill="#a98aff"
          />
        </ScatterChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart
          data={chartData}
          margin={{
            top: 15,
            right: 25,
            bottom: 15,
            left: 5
          }}
        >
          <CartesianGrid stroke="#34354b" strokeDasharray="3 3" />

          <XAxis
            dataKey={xKey}
            stroke="#a4a4ba"
            tick={{ fill: "#a4a4ba", fontSize: 11 }}
          />

          <YAxis
            stroke="#a4a4ba"
            tick={{ fill: "#a4a4ba", fontSize: 11 }}
          />

          <Tooltip
            contentStyle={{
              background: "#24243a",
              border: "1px solid #46415f",
              borderRadius: "9px",
              color: "#ffffff"
            }}
          />

          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#a98aff"
            strokeWidth={3}
            dot={{ fill: "#a98aff", r: 4 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      );
    }

    // Bar chart and histogram.
    return (
      <BarChart
        data={chartData}
        margin={{
          top: 15,
          right: 20,
          bottom: 15,
          left: 5
        }}
      >
        <CartesianGrid stroke="#34354b" strokeDasharray="3 3" />

        <XAxis
          dataKey={xKey}
          stroke="#a4a4ba"
          tick={{
            fill: "#a4a4ba",
            fontSize: 10
          }}
          interval={0}
          angle={chartData.length > 6 ? -20 : 0}
          textAnchor={chartData.length > 6 ? "end" : "middle"}
          height={chartData.length > 6 ? 65 : 35}
        />

        <YAxis
          stroke="#a4a4ba"
          tick={{ fill: "#a4a4ba", fontSize: 11 }}
        />

        <Tooltip
          contentStyle={{
            background: "#24243a",
            border: "1px solid #46415f",
            borderRadius: "9px",
            color: "#ffffff"
          }}
        />

        <Bar
          dataKey={yKey}
          fill="#9873f5"
          radius={[5, 5, 0, 0]}
          maxBarSize={55}
        />
      </BarChart>
    );
  };

  return (
    <div className="ai-chart-card">

      <div className="ai-chart-heading">
        <div className="ai-chart-heading-icon">
          <BarChart3 size={19} />
        </div>

        <div className="ai-chart-heading-text">
          <strong>{chart.title}</strong>
          <span>
            {chartType.toUpperCase()} CHART
          </span>
        </div>

        <button
          className="ai-chart-download"
          onClick={() =>
            downloadChartAsPNG(chartRef.current, chart.title)
          }
          title="Download chart as PNG"
        >
          <Download size={15} />
          Export PNG
        </button>
      </div>

      <div
        className="ai-chart-visual"
        ref={chartRef}
      >
        <ResponsiveContainer
          width="100%"
          height={330}
        >
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {chart.explanation && (
        <div className="ai-chart-explanation">
          <Lightbulb size={16} />
          <span>{chart.explanation}</span>
        </div>
      )}

      <div className="ai-chart-footer">
        <span>
          {chartData.length.toLocaleString()} data points / categories
        </span>

        <span>DATASTORY VISUALIZATION ENGINE</span>
      </div>

    </div>
  );
}


/* --------------------------------------------------
   MAIN AI ANALYST
-------------------------------------------------- */

function AIDataAnalyst() {

  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");

  const suggestedQuestions = [
    "Give me a summary of this dataset",
    "What is the average Salary?",
    "What is the maximum Salary?",
    "Show Salary distribution",
    "Compare Age and Salary",
    "Show average Salary by Department",
    "Give me one chart"
  ];

  const chatBodyRef = useRef(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop =
        chatBodyRef.current.scrollHeight;
    }
  }, [messages, asking]);

  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);

      const data = await getDatasets();

      const availableDatasets = data.datasets || [];

      setDatasets(availableDatasets);

      if (availableDatasets.length > 0) {
        setSelectedDataset(availableDatasets[0].dataset_id);
      }

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load your datasets. Please check the backend server."
      );

    } finally {
      setLoadingDatasets(false);
    }
  };


  /* --------------------------------------------------
     ASK QUESTION OR GENERATE CHART
  -------------------------------------------------- */

  const handleAsk = async (event) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (
      !trimmedQuestion ||
      !selectedDataset ||
      asking
    ) {
      return;
    }

    const userMessage = {
      role: "user",
      text: trimmedQuestion
    };

    setMessages((previous) => [
      ...previous,
      userMessage
    ]);

    setQuestion("");
    setAsking(true);
    setError("");

    try {

      if (isChartRequest(trimmedQuestion)) {

        // Send chart-related questions to chart API.
        const data = await generateDatasetChart(
          selectedDataset,
          trimmedQuestion
        );

        const chartResponse = data.response;

        if (chartResponse?.success && chartResponse.chart) {

          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text: `I've generated a chart for your request: "${trimmedQuestion}".`,
              explanation: "The chart is generated from your selected dataset.",
              chart: chartResponse.chart,
              result: null
            }
          ]);

        } else {

          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text:
                chartResponse?.message ||
                "I couldn't generate a suitable chart for this request.",
              explanation:
                "Try asking for a histogram, bar chart, scatter chart, or line chart with suitable dataset columns.",
              result: null,
              chart: null
            }
          ]);

        }

      } else {

        // Keep normal analytical questions on the existing API.
        const data = await askDatasetQuestion(
          selectedDataset,
          trimmedQuestion
        );

        const assistantMessage = {
          role: "assistant",
          text: data.response.answer,
          explanation: data.response.explanation,
          result: data.response.result,
          chart: null
        };

        setMessages((previous) => [
          ...previous,
          assistantMessage
        ]);
      }

    } catch (err) {

      const errorMessage =
        err.response?.data?.detail ||
        "Something went wrong while analyzing your dataset.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: errorMessage,
          explanation: "Please check the backend server and try again.",
          result: null,
          chart: null
        }
      ]);

    } finally {
      setAsking(false);
    }
  };


  const handleSuggestedQuestion = (value) => {
    setQuestion(value);
  };


  const clearConversation = () => {
    setMessages([]);
    setError("");
  };


  const selectedDatasetInfo = datasets.find(
    (item) => item.dataset_id === selectedDataset
  );


  return (
    <div className="analyst-page">

      {/* HEADER */}

      <div className="analyst-header">

        <div>
          <div className="analyst-eyebrow">
            <Sparkles size={15} />
            DATA INTELLIGENCE
          </div>

          <h1>
            AI Data <span>Analyst</span>
          </h1>

          <p>
            Ask questions, generate charts and discover meaningful insights.
          </p>
        </div>

        <div className="analyst-status">
          <span className="analyst-status-dot"></span>
          Analysis Engine Ready
        </div>

      </div>


      {/* DATASET SELECTOR */}

      <div className="analyst-dataset-card">

        <div className="analyst-dataset-icon">
          <Database size={22} />
        </div>

        <div className="analyst-dataset-info">
          <strong>Select your dataset</strong>

          <span>
            Choose the dataset you want to analyze.
          </span>
        </div>

        <select
          value={selectedDataset}
          onChange={(event) => {
            setSelectedDataset(event.target.value);
            setMessages([]);
            setError("");
          }}
          disabled={
            loadingDatasets ||
            datasets.length === 0
          }
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


      {/* DATASET INFORMATION */}

      {selectedDatasetInfo && (

        <div className="analyst-dataset-stats">

          <div>
            <span>Rows</span>
            <strong>
              {Number(
                selectedDatasetInfo.total_rows
              ).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>Columns</span>
            <strong>
              {selectedDatasetInfo.total_columns}
            </strong>
          </div>

          <div>
            <span>Missing Values</span>
            <strong>
              {selectedDatasetInfo.missing_values}
            </strong>
          </div>

          <div>
            <span>File Type</span>
            <strong>
              {selectedDatasetInfo.file_type}
            </strong>
          </div>

        </div>

      )}


      {/* MAIN ANALYST PANEL */}

      <div className="analyst-workspace">

        <div className="analyst-chat-header">

          <div className="analyst-chat-title">

            <div className="analyst-bot-icon">
              <Bot size={21} />
            </div>

            <div>
              <h3>DATASTORY Assistant</h3>
              <span>
                Ask questions or request charts from your dataset
              </span>
            </div>

          </div>

          <button
            className="analyst-clear-button"
            onClick={clearConversation}
            disabled={messages.length === 0}
          >
            <Trash2 size={16} />
            Clear chat
          </button>

        </div>


        {/* CHAT MESSAGES */}

        <div
          className="analyst-chat-body"
          ref={chatBodyRef}
        >

          {messages.length === 0 ? (

            <div className="analyst-empty-state">

              <div className="analyst-empty-icon">
                <Sparkles size={30} />
              </div>

              <h2>Let's explore your data.</h2>

              <p>
                Ask a question or request a chart.
                DATASTORY will analyze your selected dataset
                and display the results here.
              </p>

              <div className="analyst-suggestions-title">
                <Lightbulb size={16} />
                Try asking
              </div>

              <div className="analyst-suggestions">

                {suggestedQuestions.map((item, index) => (

                  <button
                    key={index}
                    onClick={() =>
                      handleSuggestedQuestion(item)
                    }
                    disabled={!selectedDataset}
                  >
                    {item}
                  </button>

                ))}

              </div>

            </div>

          ) : (

            <div className="analyst-message-list">

              {messages.map((message, index) => (

                <div
                  className={`analyst-message ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                  key={index}
                >

                  <div className="analyst-message-avatar">

                    {message.role === "user" ? (
                      <User size={18} />
                    ) : (
                      <Bot size={18} />
                    )}

                  </div>


                  <div className="analyst-message-content">

                    <span className="analyst-message-role">
                      {message.role === "user"
                        ? "You"
                        : "DATASTORY"}
                    </span>


                    <div className="analyst-message-text">
                      {message.text}
                    </div>


                    {/* NORMAL ANSWER EXPLANATION */}

                    {message.explanation && (

                      <div className="analyst-explanation">
                        <Lightbulb size={16} />
                        <span>{message.explanation}</span>
                      </div>

                    )}


                    {/* INTERACTIVE AI CHART */}

                    {message.chart && (
                      <AIChartCard chart={message.chart} />
                    )}


                    {/* NORMAL ANALYSIS RESULT */}

                    {message.result && (

                      <div className="analyst-result">

                        {Array.isArray(message.result.rows) ? (

                          <div className="analyst-result-table-wrapper">

                            <table className="analyst-result-table">

                              <thead>
                                <tr>

                                  {Object.keys(
                                    message.result.rows[0] || {}
                                  ).map((column) => (
                                    <th key={column}>{column}</th>
                                  ))}

                                </tr>
                              </thead>

                              <tbody>

                                {message.result.rows.map(
                                  (row, rowIndex) => (

                                    <tr key={rowIndex}>

                                      {Object.values(row).map(
                                        (value, cellIndex) => (

                                          <td key={cellIndex}>

                                            {value === null
                                              ? "—"
                                              : typeof value === "number"
                                                ? value.toLocaleString(
                                                    undefined,
                                                    {
                                                      maximumFractionDigits: 2
                                                    }
                                                  )
                                                : String(value)}

                                          </td>

                                        )
                                      )}

                                    </tr>

                                  )
                                )}

                              </tbody>

                            </table>

                          </div>

                        ) : (

                          <div className="analyst-result-details">

                            <BarChart3 size={17} />

                            {Object.entries(message.result).map(
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
                                        ? value.toLocaleString(
                                            undefined,
                                            {
                                              maximumFractionDigits: 3
                                            }
                                          )
                                        : String(value)}
                                    </strong>

                                  </div>

                                );

                              }
                            )}

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                </div>

              ))}


              {/* THINKING INDICATOR */}

              {asking && (

                <div className="analyst-thinking">

                  <LoaderCircle
                    size={18}
                    className="analyst-spinner"
                  />

                  DATASTORY is analyzing your request...

                </div>

              )}

            </div>

          )}

        </div>


        {/* QUESTION INPUT */}

        <form
          className="analyst-input-area"
          onSubmit={handleAsk}
        >

          <div className="analyst-input-box">

            <MessageSquare size={19} />

            <input
              type="text"
              placeholder={
                selectedDataset
                  ? "Ask a question or say 'Give me one chart'..."
                  : "Upload a dataset to get started..."
              }
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              disabled={!selectedDataset || asking}
            />

            <button
              type="submit"
              disabled={
                !question.trim() ||
                !selectedDataset ||
                asking
              }
            >

              {asking ? (
                <LoaderCircle
                  size={19}
                  className="analyst-spinner"
                />
              ) : (
                <Send size={19} />
              )}

            </button>

          </div>

          <span className="analyst-input-note">
            Answers and charts are generated from your selected dataset.
          </span>

        </form>

      </div>


      {/* EMPTY DATASET MESSAGE */}

      {!loadingDatasets && datasets.length === 0 && (

        <div className="analyst-no-dataset">

          <Database size={22} />

          <div>
            <strong>No datasets found</strong>

            <p>
              Upload a CSV, Excel, or JSON file from the Upload Dataset page
              before starting your analysis.
            </p>
          </div>

        </div>

      )}


      {/* ERROR MESSAGE */}

      {error && (

        <div className="analyst-error">
          <AlertCircle size={17} />
          {error}
        </div>

      )}


      {/* FOOTER */}

      <div className="analyst-footer">
        <Sparkles size={14} />
        DATASTORY ANALYSIS ENGINE · PREVIEW VERSION
      </div>

    </div>
  );

}

export default AIDataAnalyst;