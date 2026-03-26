import { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Database,
  ArrowRight,
  Loader2,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api.js";

const API_FILES = "/api/v1/files";
const API_MAPPINGS = "/api/v1/table-mappings";

// status machine:
// idle → checking → staged (duplicates found) → processing → success | error
//                 ↘ processing (no duplicates, auto-proceed)

export default function Home() {
  const [file, setFile] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [selectedMappingId, setSelectedMappingId] = useState("");

  const [targetTable, setTargetTable] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [cellRange, setCellRange] = useState("");
  const [hasHeaders, setHasHeaders] = useState(true);

  const [dialect, setDialect] = useState("postgres");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [storagePath, setStoragePath] = useState("");

  // idle | checking | staged | processing | success | error
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("preset");

  // Pre-flight data returned from staging
  // { jobId, totalRows, newRows, updates, exactDuplicates }
  const [preflight, setPreflight] = useState(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const { data } = await api.get(API_MAPPINGS);
      setMappings(data.own || []);
    } catch (err) {
      console.error("Failed to fetch presets", err);
    }
  };

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("idle");
      setPreflight(null);
      if (activeTab === "manual" && !targetTable) {
        setTargetTable(
          selectedFile.name
            .split(".")[0]
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase()
        );
      }
    }
  };

  const handlePresetChange = (id) => {
    setSelectedMappingId(id);
    const map = mappings.find((m) => m.id === id);
    if (map) {
      setTargetTable(map.target_table_name);
      setSheetName(map.sheet_name || "");
      setCellRange(map.cell_range || "");
      setHasHeaders(map.has_headers);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("excelFile", file);
    formData.append("targetTableName", targetTable);
    formData.append("sheetName", sheetName);
    formData.append("cellRange", cellRange);
    formData.append("hasHeaders", hasHeaders);

    if (activeTab === "preset" && selectedMappingId) {
      const map = mappings.find((m) => m.id === selectedMappingId);
      formData.append("connectionId", map.connection_id);
    } else {
      formData.append("dialect", dialect);
      formData.append("host", host);
      formData.append("port", port);
      formData.append("username", username);
      formData.append("password", password);
      formData.append("databaseName", databaseName);
      formData.append("storagePath", storagePath);
    }
    return formData;
  };

  // Step 1 — Upload and stage (detect duplicates)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !targetTable) return;

    setStatus("checking");
    setErrorMsg("");
    setPreflight(null);

    try {
      const { data } = await api.post(API_FILES, buildFormData(), {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // data: { jobId, totalRows, newRows, updates, exactDuplicates }
      if (data.updates === 0 && data.exactDuplicates === 0) {
        // No conflicts — auto-confirm without prompting
        await handleConfirm(data.jobId);
      } else {
        setPreflight(data);
        setStatus("staged");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.response?.data?.details || err.response?.data?.error || "Failed to analyse file.");
    }
  };

  // Step 2a — User confirmed: run background insertion
  const handleConfirm = async (jobId) => {
    const id = jobId ?? preflight?.jobId;
    if (!id) return;

    setStatus("processing");
    setPreflight(null);

    try {
      await api.post(`${API_FILES}/${id}/confirm`);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.response?.data?.error || "Ingestion failed.");
    }
  };

  // Step 2b — User cancelled: discard the job
  const handleCancel = async () => {
    if (preflight?.jobId) {
      try {
        await api.delete(`${API_FILES}/${preflight.jobId}`);
      } catch {
        // Best-effort cancel
      }
    }
    setPreflight(null);
    setStatus("idle");
  };

  const isBusy = status === "checking" || status === "processing";

  return (
    <div className="min-h-screen p-8 lg:p-12 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center lg:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-gray-900 tracking-tight"
          >
            Data{" "}
            <span className="bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Ingestion
            </span>
          </motion.h1>
          <p className="text-gray-500 mt-2 text-lg">
            Push spreadsheets into your databases using presets or manual
            config.
          </p>
        </header>

        <div className="grid lg:grid-cols-12 gap-8 bg-white border border-gray-100 p-8 rounded-4xl shadow-2xl">
          {/* Left: Upload Zone */}
          <div className="lg:col-span-6 space-y-6">
            <label
              className={`relative flex flex-col items-center justify-center h-full min-h-100 border-2 border-dashed rounded-4xl cursor-pointer transition-all duration-300 group ${
                file
                  ? "border-emerald-500/50 bg-emerald-50/30"
                  : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/20"
              }`}
            >
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="info"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center p-6 text-center"
                  >
                    <div className="p-4 bg-emerald-100 rounded-3xl mb-4">
                      <FileSpreadsheet className="w-16 h-16 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-black text-gray-900 line-clamp-1">
                      {file.name}
                    </span>
                    <span className="text-sm text-gray-400 mt-1">
                      Ready for injection ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        setStatus("idle");
                        setPreflight(null);
                      }}
                      className="mt-8 px-6 py-2 bg-white border border-gray-100 rounded-xl text-red-500 font-bold text-xs hover:bg-red-50 transition-all shadow-sm"
                    >
                      REPLACE FILE
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center p-6 text-center">
                    <div className="p-8 bg-gray-50 group-hover:bg-emerald-100 transition-colors rounded-4xl mb-6 group-hover:scale-110 duration-500">
                      <Upload className="w-12 h-12 text-gray-400 group-hover:text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">
                      Select Spreadsheet
                    </p>
                    <p className="text-sm text-gray-400 mt-2 max-w-50">
                      Drop your Excel or CSV file here to start the process.
                    </p>
                  </div>
                )}
              </AnimatePresence>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
              />
            </label>
          </div>

          {/* Right: Configuration */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex bg-gray-50 p-1.5 rounded-3xl mb-8">
              <button
                onClick={() => setActiveTab("preset")}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${
                  activeTab === "preset"
                    ? "bg-white text-emerald-600 shadow-md"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Preset Setup
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${
                  activeTab === "manual"
                    ? "bg-white text-emerald-600 shadow-md"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Manual Entry
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto max-h-150 pr-2 custom-scrollbar">
              {activeTab === "preset" ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                      Choose Configuration
                    </label>
                    <select
                      value={selectedMappingId}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-gray-700 cursor-pointer transition-all"
                    >
                      <option value="">Select a Table Preset</option>
                      {mappings.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} → {m.target_table_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Settings2 className="w-3 h-3" /> Auto-populated Rules
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          Target Table
                        </span>
                        <p className="font-bold text-gray-800 truncate">
                          {targetTable || "---"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          Range
                        </span>
                        <p className="font-bold text-gray-800">
                          {cellRange || "Full Sheet"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 ml-1">
                      <FileSpreadsheet className="w-3 h-3" /> Ingestion Target
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Target Table Name"
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-sm"
                          value={targetTable}
                          onChange={(e) => setTargetTable(e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Sheet Name (Optional)"
                        className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-sm"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Cell Range (e.g. A1:C10)"
                        className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-sm"
                        value={cellRange}
                        onChange={(e) => setCellRange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2 ml-1">
                      <Database className="w-3 h-3" /> Database Credentials
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <select
                          value={dialect}
                          onChange={(e) => setDialect(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm appearance-none cursor-pointer"
                        >
                          <option value="postgres">PostgreSQL</option>
                          <option value="mysql">MySQL</option>
                          <option value="sqlite">SQLite</option>
                          <option value="mssql">SQL Server</option>
                        </select>
                      </div>
                      {dialect !== "sqlite" ? (
                        <>
                          <input type="text" placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                          <input type="number" placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                          <div className="col-span-2">
                            <input type="text" placeholder="Database Name" value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2">
                          <input type="text" placeholder="SQLite Path (e.g. ./data/db.sqlite)" value={storagePath} onChange={(e) => setStoragePath(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status indicator */}
              <AnimatePresence>
                {status !== "idle" && status !== "staged" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`p-5 rounded-3xl border shadow-sm ${
                      status === "success"
                        ? "bg-emerald-50 border-emerald-100"
                        : status === "error"
                        ? "bg-red-50 border-red-100"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {(status === "checking" || status === "processing") && (
                        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                      )}
                      {status === "success" && (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {status === "error" && (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-gray-700">
                        {status === "checking"
                          ? "Analysing file and checking for duplicates..."
                          : status === "processing"
                          ? "Ingesting data in the background..."
                          : status === "success"
                          ? "Data successfully ingested!"
                          : errorMsg}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6">
                <button
                  disabled={
                    !file ||
                    (activeTab === "preset" && !selectedMappingId) ||
                    (activeTab === "manual" && !targetTable) ||
                    isBusy ||
                    status === "staged"
                  }
                  onClick={handleUpload}
                  className="w-full bg-black text-white py-5 rounded-4xl font-black flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-20"
                >
                  {isBusy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                  {isBusy ? "WORKING..." : "START INGESTION"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate confirmation modal */}
      <AnimatePresence>
        {status === "staged" && preflight && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-100 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-amber-50 rounded-3xl">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              {/* Message */}
              <h2 className="text-xl font-black text-gray-900 text-center tracking-tight mb-3">
                Review Before Ingesting
              </h2>

              {preflight.newRows === 0 && preflight.updates === 0 ? (
                <p className="text-sm font-bold text-red-500 text-center mb-8">
                  All rows already exist in the database. Nothing to ingest.
                </p>
              ) : (
                <p className="text-sm text-gray-500 text-center leading-relaxed mb-8">
                  Conflicts were found. Review what will happen and confirm to proceed.
                </p>
              )}

              {/* Row breakdown */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">
                    {preflight.totalRows}
                  </p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                    Total Rows
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">
                    {preflight.newRows}
                  </p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                    To Insert
                  </p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-amber-600">
                    {preflight.updates}
                  </p>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                    To Overwrite
                  </p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-red-500">
                    {preflight.exactDuplicates}
                  </p>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">
                    To Skip
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all"
                >
                  No, Cancel
                </button>
                {(preflight.newRows > 0 || preflight.updates > 0) && (
                  <button
                    onClick={() => handleConfirm()}
                    className="flex-1 bg-black hover:bg-emerald-600 text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl"
                  >
                    Yes, Proceed
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
