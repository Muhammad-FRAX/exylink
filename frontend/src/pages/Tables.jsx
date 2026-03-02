import { useState, useEffect } from "react";
import {
  Plus,
  Table as TableIcon,
  Trash2,
  Database,
  Search,
  Layout,
  Settings2,
  Loader2,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_MAPPINGS = "http://localhost:5000/api/v1/table-mappings";
const API_CONNECTIONS = "http://localhost:5000/api/v1/connections";

export default function Tables() {
  const [mappings, setMappings] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    connection_id: "",
    target_table_name: "",
    sheet_name: "",
    cell_range: "",
    has_headers: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [maps, conns] = await Promise.all([
        axios.get(API_MAPPINGS),
        axios.get(API_CONNECTIONS),
      ]);
      setMappings(maps.data);
      setConnections(conns.data);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(API_MAPPINGS, formData);
      await fetchData();
      setShowForm(false);
      setFormData({
        name: "",
        connection_id: "",
        target_table_name: "",
        sheet_name: "",
        cell_range: "",
        has_headers: true,
      });
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this table mapping?")) return;
    try {
      await axios.delete(`${API_MAPPINGS}/${id}`);
      setMappings(mappings.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Delete error", err);
    }
  };

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
              Table{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Configurations
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-500 mt-2 text-lg"
            >
              Define your preset Excel-to-Database mapping rules.
            </motion.p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:bg-emerald-600 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            New Setup
          </motion.button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {mappings.map((map) => (
                <motion.div
                  key={map.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <Layout className="w-6 h-6 text-emerald-600" />
                    </div>
                    <button
                      onClick={() => handleDelete(map.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {map.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-4 text-xs font-black uppercase tracking-widest text-emerald-600/60">
                    <Database className="w-3.5 h-3.5" />
                    {map.connection?.name || "Disconnected"}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Target Table</span>
                      <span className="font-bold text-gray-700">
                        {map.target_table_name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Sheet</span>
                      <span className="font-bold text-gray-700">
                        {map.sheet_name || "Auto"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Range</span>
                      <span className="font-bold text-gray-700">
                        {map.cell_range || "Full"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 lg:p-10"
              >
                <div className="flex items-center justify-between mb-8 text-black">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Create Table Mapping
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="X p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form
                  onSubmit={handleCreate}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Setup Name (Label)
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Daily Sales Upload"
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:bg-white transition-all text-black"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Database Connection
                    </label>
                    <select
                      required
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:bg-white transition-all appearance-none cursor-pointer text-black"
                      value={formData.connection_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          connection_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Connection</option>
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.dialect})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Target Table Name
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="raw_sales"
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:bg-white transition-all text-black"
                      value={formData.target_table_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_table_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Sheet Name
                    </label>
                    <input
                      type="text"
                      placeholder="Sheet1"
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:bg-white transition-all text-black"
                      value={formData.sheet_name}
                      onChange={(e) =>
                        setFormData({ ...formData, sheet_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Cell Range
                    </label>
                    <input
                      type="text"
                      placeholder="A1:C99"
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-400/20 focus:bg-white transition-all text-black"
                      value={formData.cell_range}
                      onChange={(e) =>
                        setFormData({ ...formData, cell_range: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-emerald-600 rounded"
                      checked={formData.has_headers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          has_headers: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-bold text-emerald-800">
                      First row contains Table Headers
                    </span>
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-black text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-30"
                    >
                      {saving
                        ? "Establishing Mapping..."
                        : "Create Configuration Entry"}
                    </button>
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
