import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Database,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/v1/files"; // Adjust for production

export default function Home() {
  const [file, setFile] = useState(null);
  const [targetTable, setTargetTable] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [status, setStatus] = useState("idle"); // idle, uploading, success, error
  const [errorMsg, setErrorMsg] = useState("");

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-suggest table name from filename
      const suggestedName = selectedFile.name
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      setTargetTable(suggestedName);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !targetTable) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("excelFile", file);
    formData.append("targetTableName", targetTable);
    formData.append("sheetName", sheetName);

    try {
      const response = await axios.post(API_BASE_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload success:", response.data);
      setStatus("success");
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setErrorMsg(err.response?.data?.error || "Connection to backend failed.");
    }
  };

  return (
    <div className="min-h-screen p-8 lg:p-12 animate-in fade-in duration-700">
      {/* Container Card */}
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center lg:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-gray-900 tracking-tight"
          >
            Data{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Import
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 mt-2 text-lg"
          >
            Powerful Excel-to-Database engine. Inject clean datasets in seconds.
          </motion.p>
        </header>

        <div className="grid lg:grid-cols-5 gap-8 bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[2rem] shadow-[rgba(0,0,0,0.05)_0px_20px_50px]">
          {/* Main Upload Area */}
          <div className="lg:col-span-3 space-y-6">
            <label
              className={`relative flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 group ${
                file
                  ? "border-emerald-500/50 bg-emerald-50/30"
                  : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/20"
              }`}
            >
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-info"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-col items-center p-6 text-center"
                  >
                    <div className="p-4 bg-emerald-100 rounded-2xl mb-4">
                      <FileSpreadsheet className="w-12 h-12 text-emerald-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 line-clamp-1">
                      {file.name}
                    </span>
                    <span className="text-sm text-gray-400 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="mt-6 text-red-500 font-semibold text-sm hover:underline"
                    >
                      Change File
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="p-5 bg-gray-50 group-hover:bg-emerald-100 transition-colors rounded-3xl mb-4 group-hover:scale-110 duration-300">
                      <Upload className="w-10 h-10 text-gray-400 group-hover:text-emerald-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      Choose an Excel or CSV file
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Drag and drop also works
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
              />
            </label>

            {/* Status Feedback */}
            <AnimatePresence>
              {status === "uploading" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span className="text-sm font-medium text-gray-600">
                    Pushing to heart... Initializing injection engine.
                  </span>
                </motion.div>
              )}
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
                >
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">
                      Mission Accomplished!
                    </p>
                    <p className="text-xs text-emerald-600">
                      The injection is running in the background. Check your
                      database shortly.
                    </p>
                  </div>
                </motion.div>
              )}
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100"
                >
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">
                      Injection Failed
                    </p>
                    <p className="text-xs text-red-600 font-mono">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Configuration Area */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Database className="w-5 h-5 opacity-50" />
              Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Target Table Name
                </label>
                <input
                  type="text"
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  placeholder="e.g. quarterly_revenue"
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Specific SheetName
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Leave blank for auto-detect"
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
                />
              </div>

              <div className="pt-4">
                <button
                  disabled={!file || !targetTable || status === "uploading"}
                  onClick={handleUpload}
                  className="w-full bg-black text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:pointer-events-none group shadow-xl hover:shadow-emerald-500/20"
                >
                  {status === "uploading" ? (
                    "Processing..."
                  ) : (
                    <>
                      Start Ingestion
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed px-1">
              By starting ingestion, you agree that your data will be parsed and
              injected into the configured target database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
