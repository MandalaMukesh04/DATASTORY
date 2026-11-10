
import {
  LayoutDashboard,
  Database,
  Upload,
  BrainCircuit,
  ChartNoAxesCombined,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  MoreHorizontal,
  Activity,
  Zap,
  Clock3,
  ChevronRight,
  Menu,
  Target,
  X,
  Presentation
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { useState } from "react";
import "./App.css";

import UploadDataset from "./components/UploadDataset";
import MyDatasets from "./components/MyDatasets";
import DataExplorer from "./components/DataExplorer";
import Visualizations from "./components/Visualizations";
import AIDataAnalyst from "./components/AIDataAnalyst";
import BusinessInsights from "./components/BusinessInsights";
import MachineLearning from "./components/MachineLearning";
import ModelPrediction from "./components/ModelPrediction";
import Reports from "./components/Reports";
import ReportStudio from "./components/ReportStudio";

const chartData = [
  { month: "Jan", value: 3200 },
  { month: "Feb", value: 4100 },
  { month: "Mar", value: 3700 },
  { month: "Apr", value: 5200 },
  { month: "May", value: 4600 },
  { month: "Jun", value: 6100 },
  { month: "Jul", value: 5700 },
  { month: "Aug", value: 7300 },
  { month: "Sep", value: 6800 },
  { month: "Oct", value: 8500 },
  { month: "Nov", value: 7900 },
  { month: "Dec", value: 9600 }
];

const activities = [
  {
    icon: FileSpreadsheet,
    title: "Sales Analysis Dataset",
    description: "Dataset uploaded successfully",
    time: "10 minutes ago",
    color: "purple"
  },
  {
    icon: ChartNoAxesCombined,
    title: "Customer Insights",
    description: "Exploratory analysis completed",
    time: "1 hour ago",
    color: "blue"
  },
  {
    icon: BrainCircuit,
    title: "Prediction Model",
    description: "Machine learning model created",
    time: "Yesterday",
    color: "green"
  }
];

function App() {
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      heading: "WORKSPACE",
      items: [
        { name: "Overview", icon: LayoutDashboard },
        { name: "My Datasets", icon: Database },
        { name: "Data Explorer", icon: ChartNoAxesCombined },
        { name: "AI Data Analyst", icon: Sparkles },
        { name: "Visualizations", icon: ChartNoAxesCombined }
      ]
    },
    {
      heading: "INTELLIGENCE",
      items: [
        { name: "Business Insights", icon: Sparkles },
        { name: "Machine Learning", icon: BrainCircuit },
        { name: "Model Prediction", icon: Target },
        { name: "Reports", icon: FileSpreadsheet },
        { name: "Report Studio", icon: Presentation }
      ]
    }
  ];

  return (
    <div className="app-container">

      {/* SIDEBAR */}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

        <div className="brand">

          <div className="brand-icon">
            <Activity size={23} />
          </div>

          <div>
            <h2>DATASTORY<span>.</span></h2>
            <p>INTELLIGENCE PLATFORM</p>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>

        </div>

        <div className="workspace-selector">

          <div className="workspace-avatar">M</div>

          <div className="workspace-info">
            <strong>My Workspace</strong>
            <span>Personal account</span>
          </div>

          <MoreHorizontal size={19} />

        </div>

        <div className="navigation">

          {navigation.map((section) => (

            <div className="nav-section" key={section.heading}>

              <p className="nav-heading">{section.heading}</p>

              {section.items.map((item) => {

                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    className={`nav-item ${
                      activeMenu === item.name ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveMenu(item.name);
                      setSidebarOpen(false);
                    }}
                  >

                    <Icon size={18} />

                    <span>{item.name}</span>

                    {item.name === "AI Data Analyst" && (
                      <span className="new-badge">AI</span>
                    )}

                    {item.name === "Report Studio" && (
                      <span className="new-badge">NEW</span>
                    )}

                  </button>
                );

              })}

            </div>

          ))}

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="topbar-left">

            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={15} />
              <strong>{activeMenu}</strong>
            </div>

          </div>

        </header>

        {/* DASHBOARD BODY */}

        <div className="dashboard-content">

          {activeMenu === "Upload Dataset" ? (

            <UploadDataset />

          ) : activeMenu === "My Datasets" ? (

            <MyDatasets />

          ) : activeMenu === "Data Explorer" ? (

            <DataExplorer />

          ) : activeMenu === "AI Data Analyst" ? (

            <AIDataAnalyst />

          ) : activeMenu === "Visualizations" ? (

            <Visualizations />

          ) : activeMenu === "Business Insights" ? (

            <BusinessInsights />

          ) : activeMenu === "Machine Learning" ? (

            <MachineLearning />

          ) : activeMenu === "Model Prediction" ? (

            <ModelPrediction />

          ) : activeMenu === "Reports" ? (

            <Reports />

          ) : activeMenu === "Report Studio" ? (

            <ReportStudio />

          ) : (

            <>

              {/* WELCOME SECTION */}

              <div className="welcome-section">

                <div>

                  <div className="welcome-label">
                    <span className="status-dot"></span>
                    YOUR ANALYTICS WORKSPACE
                  </div>

                  <h1>
                    Turn your data into <span>decisions.</span>
                  </h1>

                  <p>
                    Welcome back! Let's discover what your data is telling us.
                  </p>

                </div>

                <button
                  className="primary-button"
                  onClick={() => setActiveMenu("Upload Dataset")}
                >
                  <Plus size={18} />
                  New Project
                </button>

              </div>

              {/* STATISTICS */}

              <section className="stats-grid">

                <div className="stat-card">

                  <div className="stat-top">

                    <div className="stat-icon purple-bg">
                      <Database size={20} />
                    </div>

                    <span className="stat-trend positive">
                      <ArrowUpRight size={15} /> 12.5%
                    </span>

                  </div>

                  <p className="stat-label">Total Datasets</p>
                  <h2>24</h2>

                  <span className="stat-description">
                    Across your workspace
                  </span>

                </div>

                <div className="stat-card">

                  <div className="stat-top">

                    <div className="stat-icon blue-bg">
                      <ChartNoAxesCombined size={20} />
                    </div>

                    <span className="stat-trend positive">
                      <ArrowUpRight size={15} /> 8.2%
                    </span>

                  </div>

                  <p className="stat-label">Analyses Completed</p>
                  <h2>156</h2>

                  <span className="stat-description">
                    Total analysis operations
                  </span>

                </div>

                <div className="stat-card">

                  <div className="stat-top">

                    <div className="stat-icon green-bg">
                      <BrainCircuit size={20} />
                    </div>

                    <span className="stat-trend positive">
                      <ArrowUpRight size={15} /> 5.4%
                    </span>

                  </div>

                  <p className="stat-label">ML Models</p>
                  <h2>08</h2>

                  <span className="stat-description">
                    Models created
                  </span>

                </div>

                <div className="stat-card">

                  <div className="stat-top">

                    <div className="stat-icon orange-bg">
                      <Zap size={20} />
                    </div>

                    <span className="stat-trend negative">
                      <ArrowDownRight size={15} /> 2.1%
                    </span>

                  </div>

                  <p className="stat-label">Insights Generated</p>
                  <h2>342</h2>

                  <span className="stat-description">
                    AI-powered discoveries
                  </span>

                </div>

              </section>

              {/* CHART AND QUICK ACTIONS */}

              <section className="middle-grid">

                <div className="panel analytics-panel">

                  <div className="panel-header">

                    <div>
                      <h3>Analytics Overview</h3>
                      <p>Visualize your workspace activity</p>
                    </div>

                    <select defaultValue="12 months">
                      <option>12 months</option>
                      <option>6 months</option>
                      <option>30 days</option>
                    </select>

                  </div>

                  <div className="chart-summary">

                    <h2>9,600</h2>

                    <span className="chart-growth">
                      <ArrowUpRight size={15} /> 18.6%
                    </span>

                    <span className="chart-caption">
                      Analysis activity index
                    </span>

                  </div>

                  <div className="chart-container">

                    <ResponsiveContainer width="100%" height="100%">

                      <AreaChart data={chartData}>

                        <defs>

                          <linearGradient
                            id="chartGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >

                            <stop
                              offset="0%"
                              stopColor="#9872ff"
                              stopOpacity={0.35}
                            />

                            <stop
                              offset="100%"
                              stopColor="#9872ff"
                              stopOpacity={0}
                            />

                          </linearGradient>

                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#252638"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="month"
                          stroke="#77788c"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                        />

                        <YAxis
                          stroke="#77788c"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#191a2a",
                            border: "1px solid #38384e",
                            borderRadius: "10px",
                            color: "#ffffff"
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#9872ff"
                          strokeWidth={3}
                          fill="url(#chartGradient)"
                        />

                      </AreaChart>

                    </ResponsiveContainer>

                  </div>

                </div>

                <div className="panel quick-panel">

                  <div className="panel-header">

                    <div>
                      <h3>Quick Actions</h3>
                      <p>Start something new</p>
                    </div>

                  </div>

                  <button
                    className="action-card"
                    onClick={() => setActiveMenu("Upload Dataset")}
                  >

                    <div className="action-icon purple-bg">
                      <Upload size={20} />
                    </div>

                    <div>
                      <strong>Upload Dataset</strong>
                      <span>Import CSV, Excel or JSON</span>
                    </div>

                    <ChevronRight size={18} />

                  </button>

                  <button
                    className="action-card"
                    onClick={() => setActiveMenu("Data Explorer")}
                  >

                    <div className="action-icon blue-bg">
                      <ChartNoAxesCombined size={20} />
                    </div>

                    <div>
                      <strong>Explore Data</strong>
                      <span>Discover patterns and trends</span>
                    </div>

                    <ChevronRight size={18} />

                  </button>

                  <button
                    className="action-card"
                    onClick={() => setActiveMenu("Machine Learning")}
                  >

                    <div className="action-icon green-bg">
                      <BrainCircuit size={20} />
                    </div>

                    <div>
                      <strong>Build ML Model</strong>
                      <span>Train predictive models</span>
                    </div>

                    <ChevronRight size={18} />

                  </button>

                  <button
                    className="action-card"
                    onClick={() => setActiveMenu("AI Data Analyst")}
                  >

                    <div className="action-icon orange-bg">
                      <Sparkles size={20} />
                    </div>

                    <div>
                      <strong>Ask AI Analyst</strong>
                      <span>Get answers from your data</span>
                    </div>

                    <ChevronRight size={18} />

                  </button>

                  <button
                    className="action-card"
                    onClick={() => setActiveMenu("Report Studio")}
                  >

                    <div className="action-icon purple-bg">
                      <Presentation size={20} />
                    </div>

                    <div>
                      <strong>Create a Report</strong>
                      <span>Build an AI-powered report</span>
                    </div>

                    <ChevronRight size={18} />

                  </button>

                </div>

              </section>

              {/* BOTTOM SECTION */}

              <section className="bottom-grid">

                <div className="panel recent-panel">

                  <div className="panel-header">

                    <div>
                      <h3>Recent Activity</h3>
                      <p>Your latest workspace operations</p>
                    </div>

                    <button className="text-button">
                      View all <ArrowUpRight size={15} />
                    </button>

                  </div>

                  <div className="activity-list">

                    {activities.map((activity, index) => {

                      const Icon = activity.icon;

                      return (

                        <div className="activity-item" key={index}>

                          <div className={`activity-icon ${activity.color}-bg`}>
                            <Icon size={19} />
                          </div>

                          <div className="activity-details">
                            <strong>{activity.title}</strong>
                            <span>{activity.description}</span>
                          </div>

                          <div className="activity-time">
                            <Clock3 size={13} />
                            {activity.time}
                          </div>

                        </div>

                      );

                    })}

                  </div>

                </div>

                <div className="panel ai-panel">

                  <div className="ai-glow"></div>

                  <div className="ai-icon">
                    <Sparkles size={24} />
                  </div>

                  <span className="ai-label">INTRODUCING AI ANALYST</span>

                  <h3>
                    Your data has a story.
                    <br />
                    Let's uncover it.
                  </h3>

                  <p>
                    Ask questions, discover hidden patterns and turn complex
                    datasets into meaningful business insights.
                  </p>

                  <button
                    className="ai-button"
                    onClick={() => setActiveMenu("AI Data Analyst")}
                  >
                    Explore AI Analyst
                    <ArrowUpRight size={17} />
                  </button>

                </div>

              </section>

              <footer className="dashboard-footer">
                <span>© 2026 DATASTORY. All rights reserved.</span>
                <span>Built for smarter decisions.</span>
              </footer>

            </>

          )}

        </div>

      </main>

      {/* MOBILE SIDEBAR OVERLAY */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

    </div>
  );
}

export default App;
