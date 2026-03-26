import { useState, useEffect } from "react";
import {
  Plus,
  Database,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Edit3,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = "/api/v1/connections";

export default function DataConnections() {
  const { user } = useAuth();
  const [own, setOwn] = useState([]);
  const [others, setOthers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    dialect: "postgres",
    host: "",
    port: "",
    username: "",
    password: "",
    database_name: "",
    storage_path: "",
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data } = await api.get(API_BASE);
      setOwn(data.own || []);
      setOthers(data.others || []);
    } catch (err) {
      console.error("Fetch connections failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (conn = null) => {
    if (conn) {
      setEditId(conn.id);
      setFormData({
        name: conn.name,
        dialect: conn.dialect,
        host: conn.host || "",
        port: conn.port || "",
        username: conn.username || "",
        password: conn.password || "",
        database_name: conn.database_name || "",
        storage_path: conn.storage_path || "",
      });
    } else {
      setEditId(null);
      setFormData({
        name: "",
        dialect: "postgres",
        host: "",
        port: "",
        username: "",
        password: "",
        database_name: "",
        storage_path: "",
      });
    }
    setTestResult(null);
    setShowForm(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post(`${API_BASE}/test`, formData);
      setTestResult({ success: true, message: data.message });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || "Connection failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editId) {
        await api.put(`${API_BASE}/${editId}`, formData);
      } else {
        await api.post(API_BASE, formData);
      }
      await fetchConnections();
      setShowForm(false);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this connection?")) return;
    try {
      await api.delete(`${API_BASE}/${id}`);
      await fetchConnections();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const ConnectionCard = ({ conn, showOwner = false }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="group bg-white border border-gray-100 p-6 rounded-4xl shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 flex items-start gap-5">
        <div className="p-4 bg-emerald-50 rounded-2xl shrink-0">
          <Database className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900">{conn.name}</h3>
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[9px] uppercase font-black rounded-lg tracking-wider border border-gray-100">
              {conn.dialect}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-400 font-mono truncate max-w-[200px]">
            {conn.dialect === "sqlite"
              ? conn.storage_path
              : `${conn.host}:${conn.port}`}
          </p>
          {showOwner && conn.owner && (
            <p className="text-xs text-gray-400 mt-0.5">
              by <span className="font-bold">{conn.owner.username}</span>
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleOpenForm(conn)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(conn.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-8 lg:p-12 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-black text-gray-900 tracking-tight"
            >
              Data{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Connections
              </span>
            </motion.h1>
            <p className="text-gray-500 mt-2 text-lg">
              Manage and test your database target credentials.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:bg-emerald-600 transition-all duration-300"
          >
            <Plus className="w-5 h-5" /> Add Connection
          </motion.button>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Own connections */}
            <section>
              {user?.role === "admin" && (
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 ml-1">
                  My Connections
                </h2>
              )}
              {own.length === 0 ? (
                <p className="text-gray-400 text-sm font-medium">
                  No connections yet. Add one above.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {own.map((conn) => (
                      <ConnectionCard key={conn.id} conn={conn} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* Other users' connections (admin only) */}
            {user?.role === "admin" && others.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    All Users' Connections
                  </h2>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded-lg tracking-wider">
                    {others.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {others.map((conn) => (
                      <ConnectionCard key={conn.id} conn={conn} showOwner />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                      {editId ? (
                        <Edit3 className="w-6 h-6" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      {editId ? "Edit Connection" : "New Connection"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Friendly Name
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Reporting DB"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Dialect
                    </label>
                    <select
                      value={formData.dialect}
                      onChange={(e) =>
                        setFormData({ ...formData, dialect: e.target.value })
                      }
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none appearance-none cursor-pointer text-gray-700"
                    >
                      <option value="postgres">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="sqlite">SQLite</option>
                      <option value="mssql">SQL Server</option>
                    </select>
                  </div>

                  {formData.dialect !== "sqlite" ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Host
                        </label>
                        <input
                          type="text"
                          placeholder="localhost"
                          value={formData.host}
                          onChange={(e) =>
                            setFormData({ ...formData, host: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white border-none outline-none font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Port
                        </label>
                        <input
                          type="number"
                          placeholder="5432"
                          value={formData.port}
                          onChange={(e) =>
                            setFormData({ ...formData, port: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white border-none outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Username"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({ ...formData, username: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Database Name"
                          value={formData.database_name}
                          onChange={(e) =>
                            setFormData({ ...formData, database_name: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Path to .sqlite file"
                        value={formData.storage_path}
                        onChange={(e) =>
                          setFormData({ ...formData, storage_path: e.target.value })
                        }
                        className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-4 pt-4">
                    <AnimatePresence>
                      {testResult && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className={`p-4 rounded-2xl flex items-center gap-3 ${
                            testResult.success
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 shrink-0" />
                          )}
                          <span className="text-xs font-bold leading-relaxed">
                            {testResult.message}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing}
                        className="flex-1 bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                      >
                        {testing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}{" "}
                        {testing ? "Testing..." : "Test Connection"}
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 bg-black text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl hover:bg-emerald-600 disabled:opacity-20 active:scale-95"
                      >
                        {isSaving
                          ? "Saving..."
                          : editId
                          ? "Update Connection"
                          : "Save Connection"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
