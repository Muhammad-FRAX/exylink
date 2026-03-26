import { useState, useEffect } from "react";
import {
  Plus,
  Users as UsersIcon,
  Trash2,
  Edit3,
  KeyRound,
  Loader2,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_USERS = "/api/v1/users";

const ROLE_STYLES = {
  admin: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  visitor: "bg-gray-50 text-gray-500 border border-gray-100",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [passwordTargetId, setPasswordTargetId] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "visitor",
  });
  const [passwordData, setPasswordData] = useState({ newPassword: "" });
  const [formError, setFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(API_USERS);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormData({ username: "", email: "", password: "", role: "visitor" });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setFormData({ username: u.username, email: u.email, password: "", role: u.role });
    setFormError("");
    setShowForm(true);
  };

  const openPasswordModal = (userId) => {
    setPasswordTargetId(userId);
    setPasswordData({ newPassword: "" });
    setPasswordError("");
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError("");
    try {
      if (editId) {
        const payload = { username: formData.username, email: formData.email, role: formData.role };
        await api.put(`${API_USERS}/${editId}`, payload);
      } else {
        await api.post(API_USERS, formData);
      }
      await fetchUsers();
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error || "Operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.delete(`${API_USERS}/${id}`);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`${API_USERS}/${u.id}`, { is_active: !u.is_active });
      await fetchUsers();
    } catch (err) {
      console.error("Toggle active failed", err);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setPasswordError("");
    try {
      await api.put(`${API_USERS}/${passwordTargetId}/password`, passwordData);
      setShowPasswordModal(false);
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Password update failed.");
    } finally {
      setIsSaving(false);
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
              User{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Management
              </span>
            </motion.h1>
            <p className="text-gray-500 mt-2 text-lg">
              Manage accounts, roles and access.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:bg-emerald-600 transition-all duration-300"
          >
            <Plus className="w-5 h-5" /> Add User
          </motion.button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64 opacity-20">
            <Loader2 className="w-12 h-12 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {users.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="group bg-white border border-gray-100 p-6 rounded-4xl shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex items-start gap-5">
                    <div className="p-4 bg-emerald-50 rounded-2xl shrink-0">
                      <UsersIcon className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">
                          {u.username}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[9px] uppercase font-black rounded-lg tracking-wider ${ROLE_STYLES[u.role]}`}
                        >
                          {u.role}
                        </span>
                        {!u.is_active && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[9px] uppercase font-black rounded-lg tracking-wider border border-red-100">
                            Inactive
                          </span>
                        )}
                        {u.id === currentUser.id && (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[9px] uppercase font-black rounded-lg tracking-wider border border-teal-100">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 font-mono truncate">
                        {u.email}
                      </p>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit user"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPasswordModal(u.id)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Change password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title={u.is_active ? "Deactivate" : "Activate"}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create / Edit Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 lg:p-10 relative"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                      {editId ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      {editId ? "Edit User" : "New User"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Username
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="john_doe"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none"
                    />
                  </div>

                  {!editId && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Password
                      </label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none appearance-none cursor-pointer text-gray-700"
                    >
                      <option value="visitor">Visitor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {formError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      {formError}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-black text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl hover:bg-emerald-600 disabled:opacity-20 active:scale-95"
                    >
                      {isSaving ? "Saving..." : editId ? "Update User" : "Create User"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Change Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 lg:p-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      Change Password
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ newPassword: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-400/10 outline-none font-bold transition-all border-none pr-14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      {passwordError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-black text-white py-4 rounded-3xl font-black text-xs tracking-widest uppercase transition-all shadow-xl hover:bg-emerald-600 disabled:opacity-20 active:scale-95"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
