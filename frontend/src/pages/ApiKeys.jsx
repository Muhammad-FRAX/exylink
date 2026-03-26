import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldOff,
  Clock,
  AlertTriangle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api.js";

const API_KEYS = "/api/v1/api-keys";

const DURATIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never expires" },
];

const STATUS = {
  active: { label: "Active", classes: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  expired: { label: "Expired", classes: "bg-amber-50 text-amber-600 border border-amber-100" },
  revoked: { label: "Revoked", classes: "bg-red-50 text-red-500 border border-red-100" },
};

function getStatus(key) {
  if (!key.is_active) return "revoked";
  if (key.expires_at && new Date(key.expires_at) < new Date()) return "expired";
  return "active";
}

function fmtDate(dateStr) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relTime(dateStr) {
  if (!dateStr) return "Never";
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60_000) return "Just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

// ---------------------------------------------------------------------------
// Key card
// ---------------------------------------------------------------------------
function KeyCard({ apiKey, onRevoke, onDelete }) {
  const status = getStatus(apiKey);
  const { label, classes } = STATUS[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
    >
      {/* Name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-gray-50 rounded-xl shrink-0">
            <Key size={16} className="text-gray-400" />
          </div>
          <p className="font-black text-gray-900 truncate">{apiKey.name}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${classes}`}>
          {label}
        </span>
      </div>

      {/* Key prefix */}
      <div className="bg-gray-50 rounded-2xl px-4 py-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Key</p>
        <code className="text-sm font-bold text-gray-700 tracking-wider">
          {apiKey.key_prefix}••••••••••••••••••••
        </code>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Expires</p>
          <p className="text-xs font-bold text-gray-700">{fmtDate(apiKey.expires_at)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Last Used</p>
          <p className="text-xs font-bold text-gray-700">{relTime(apiKey.last_used_at)}</p>
        </div>
      </div>

      {/* Created */}
      <p className="text-[10px] text-gray-300 font-bold flex items-center gap-1">
        <Clock size={10} />
        Created {fmtDate(apiKey.created_at)}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-50">
        {status === "active" && (
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <ShieldOff size={12} />
            Revoke
          </button>
        )}
        <button
          onClick={() => onDelete(apiKey.id, apiKey.name)}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-colors ${status === "active" ? "" : "flex-1"}`}
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState(null); // { fullKey, name } — shown once
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [docsOpen, setDocsOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", duration: "never" });
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_KEYS);
      setKeys(data);
    } catch (err) {
      console.error("Failed to fetch API keys", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(API_KEYS, form);
      // Add to list (without the fullKey — already excluded)
      setKeys((prev) => [
        {
          id: data.id,
          name: data.name,
          key_prefix: data.key_prefix,
          expires_at: data.expires_at,
          is_active: data.is_active,
          last_used_at: data.last_used_at,
          created_at: data.created_at,
        },
        ...prev,
      ]);
      setShowCreateModal(false);
      setForm({ name: "", duration: "never" });
      setCreatedKey({ fullKey: data.fullKey, name: data.name });
    } catch (err) {
      console.error("Failed to create API key", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.patch(`${API_KEYS}/${id}/revoke`);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, is_active: false } : k))
      );
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`${API_KEYS}/${confirmDelete.id}`);
      setKeys((prev) => prev.filter((k) => k.id !== confirmDelete.id));
    } catch (err) {
      console.error("Failed to delete key", err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const copyToClipboard = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  const endpointPath = "/api/external/ingest";
  const curlPreset = `# Mode A: using a saved preset
curl -X POST http://localhost:5000${endpointPath} \\
  -H "X-API-Key: exy_your_key_here" \\
  -F "file=@your-data.xlsx" \\
  -F "preset_id=YOUR_PRESET_ID"`;

  const curlManual = `# Mode B: manual connection params
curl -X POST http://localhost:5000${endpointPath} \\
  -H "X-API-Key: exy_your_key_here" \\
  -F "file=@your-data.xlsx" \\
  -F "target_table_name=sales_data" \\
  -F "dialect=postgres" \\
  -F "host=localhost" \\
  -F "port=5432" \\
  -F "username=myuser" \\
  -F "password=mypass" \\
  -F "database_name=mydb" \\
  -F "sheet_name=Sheet1" \\
  -F "cell_range=A1:Z500" \\
  -F "has_headers=true"`;

  const responseExample = `{
  "success": true,
  "preset": "Monthly Sales",
  "targetTable": "sales_data",
  "stats": {
    "totalRows": 150,
    "inserted": 120,
    "updated": 10,
    "skipped": 20
  }
}`;

  return (
    <div className="min-h-screen p-8 lg:p-12 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              API{" "}
              <span className="bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Keys
              </span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Generate keys to automate data ingestion without opening the app.
            </p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={16} />
            New Key
          </motion.button>
        </header>

        {/* Integration Guide */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-4xl shadow-sm mb-8 overflow-hidden"
        >
          <button
            onClick={() => setDocsOpen((o) => !o)}
            className="w-full flex items-center justify-between p-6 lg:p-8 text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-2xl">
                <Terminal size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-black text-gray-900">Integration Guide</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  How to call the ingestion API from your automation scripts
                </p>
              </div>
            </div>
            {docsOpen ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {docsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 lg:px-8 lg:pb-8 border-t border-gray-50 pt-6">
                  <div className="grid lg:grid-cols-2 gap-6">

                    {/* Left: endpoint info */}
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Endpoint
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                            POST
                          </span>
                          <code className="text-sm font-bold text-gray-700">
                            {endpointPath}
                          </code>
                          <button
                            onClick={() => copyToClipboard(endpointPath, setCopied)}
                            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {copied ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Headers
                        </p>
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                              X-API-Key
                            </code>
                            <span className="text-xs text-gray-500">Your API key</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                              Content-Type
                            </code>
                            <span className="text-xs text-gray-500">multipart/form-data</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Always Required
                        </p>
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            <code className="text-[11px] font-bold text-gray-700 bg-white border border-gray-100 px-2 py-0.5 rounded-lg shrink-0">file</code>
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 shrink-0">required</span>
                            <span className="text-xs text-gray-400">Excel (.xlsx/.xls) or CSV</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Mode A — Preset
                        </p>
                        <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-2xl p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            <code className="text-[11px] font-bold text-gray-700 bg-white border border-gray-100 px-2 py-0.5 rounded-lg shrink-0">preset_id</code>
                            <span className="text-xs text-gray-500">ID from Table Configs page</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Mode B — Manual Params
                        </p>
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                          {[
                            { field: "target_table_name", req: true, desc: "Destination table" },
                            { field: "dialect", req: true, desc: "postgres · mysql · sqlite · mssql" },
                            { field: "host", desc: "DB host (non-sqlite)" },
                            { field: "port", desc: "DB port (non-sqlite)" },
                            { field: "username", desc: "DB user" },
                            { field: "password", desc: "DB password" },
                            { field: "database_name", req: true, desc: "Database (non-sqlite)" },
                            { field: "storage_path", desc: "File path for sqlite" },
                            { field: "sheet_name", desc: "Sheet to read (default: first)" },
                            { field: "cell_range", desc: "Range e.g. A1:C100 (default: all)" },
                            { field: "has_headers", desc: "true/false (default: true)" },
                          ].map(({ field, req, desc }) => (
                            <div key={field} className="flex items-start gap-2">
                              <code className="text-[11px] font-bold text-gray-700 bg-white border border-gray-100 px-2 py-0.5 rounded-lg shrink-0">{field}</code>
                              {req && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 shrink-0">req</span>}
                              <span className="text-xs text-gray-400">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-4">
                        <div className="flex items-start gap-2">
                          <Zap size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                            When using a preset, you can still override <strong>sheet_name</strong>,{" "}
                            <strong>cell_range</strong>, <strong>has_headers</strong>, and{" "}
                            <strong>target_table_name</strong> per-request.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: code examples */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Mode A — Preset
                        </p>
                        <div className="bg-gray-900 rounded-2xl overflow-hidden">
                          <div className="px-4 py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">bash</span>
                          </div>
                          <pre className="p-4 text-xs text-gray-300 leading-relaxed overflow-x-auto font-mono">
                            {curlPreset}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Mode B — Manual Params
                        </p>
                        <div className="bg-gray-900 rounded-2xl overflow-hidden">
                          <div className="px-4 py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">bash</span>
                          </div>
                          <pre className="p-4 text-xs text-gray-300 leading-relaxed overflow-x-auto font-mono">
                            {curlManual}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Response
                        </p>
                        <div className="bg-gray-900 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                              json
                            </span>
                          </div>
                          <pre className="p-4 text-xs text-emerald-400 leading-relaxed overflow-x-auto font-mono">
                            {responseExample}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Keys grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="p-8 bg-gray-50 rounded-4xl mb-6">
              <Key className="w-12 h-12 text-gray-200" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-2">No API Keys Yet</p>
            <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
              Create your first API key to start automating data ingestion from your scripts and workflows.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
            >
              <Plus size={16} />
              Create First Key
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              {keys.length} {keys.length === 1 ? "key" : "keys"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>
                {keys.map((k) => (
                  <KeyCard
                    key={k.id}
                    apiKey={k}
                    onRevoke={handleRevoke}
                    onDelete={(id, name) => setConfirmDelete({ id, name })}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create modal                                                         */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-100 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="bg-white w-full max-w-md rounded-4xl shadow-2xl p-8"
            >
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">
                New API Key
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Give your key a name and choose how long it stays valid.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Production Automation"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    Expires
                  </label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold text-sm appearance-none cursor-pointer"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setForm({ name: "", duration: "never" });
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!form.name.trim() || creating}
                    className="flex-1 bg-black hover:bg-emerald-600 text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    {creating ? "Creating..." : "Create Key"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Show-once key modal — cannot be dismissed by clicking outside        */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {createdKey && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-100 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="bg-white w-full max-w-lg rounded-4xl shadow-2xl p-8"
            >
              {/* Warning */}
              <div className="flex justify-center mb-5">
                <div className="p-4 bg-amber-50 rounded-3xl">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 text-center tracking-tight mb-2">
                Save Your Key Now
              </h2>
              <p className="text-sm text-gray-400 text-center leading-relaxed mb-6">
                This is the only time <strong className="text-gray-700">{createdKey.name}</strong> will be shown.
                Copy it and store it somewhere safe — it cannot be recovered.
              </p>

              {/* The key */}
              <div className="bg-gray-900 rounded-2xl p-4 mb-4 relative">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  API Key
                </p>
                <code className="block text-sm font-bold text-emerald-400 break-all leading-relaxed pr-8 font-mono">
                  {createdKey.fullKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey.fullKey, setKeyCopied)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {keyCopied ? (
                    <Check size={15} className="text-emerald-400" />
                  ) : (
                    <Copy size={15} className="text-gray-300" />
                  )}
                </button>
              </div>

              {keyCopied && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs font-bold text-emerald-600 mb-4"
                >
                  Copied to clipboard!
                </motion.p>
              )}

              <button
                onClick={() => setCreatedKey(null)}
                className="w-full bg-black hover:bg-emerald-600 text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl mt-2"
              >
                I Have Saved My Key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirmation modal                                            */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-100 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="bg-white w-full max-w-sm rounded-4xl shadow-2xl p-8"
            >
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">
                Delete Key?
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                <strong className="text-gray-700">{confirmDelete.name}</strong> will be
                permanently deleted. Any automation using it will stop working immediately.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
