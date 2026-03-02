import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, LogOut, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/exylink-logo.png";

export default function Sidebar() {
  const navItems = [
    { name: "Home", path: "/", icon: LayoutDashboard },
    { name: "Data Connections", path: "/connections", icon: Database },
    { name: "Table Configs", path: "/tables", icon: Layout },
  ];

  return (
    <aside className="h-screen w-72 bg-white border-r border-gray-100 flex flex-col shadow-[rgba(17,_17,_26,_0.1)_0px_0px_16px] z-50">
      {/* Header */}
      <div className="p-8 flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
          <img
            src={logo}
            alt="Exylink Logo"
            className="w-12 h-12 object-contain relative z-10"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent tracking-tight">
            Exylink
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative mb-1 ${
                isActive
                  ? "text-emerald-700 font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 pointer-events-none"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                        mass: 1,
                      }}
                    >
                      {/* Active Background Pill */}
                      <div className="absolute inset-0 bg-emerald-50 ring-1 ring-emerald-100/50 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.1)] rounded-xl" />

                      {/* Active Left Indicator Marker */}
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Non-active Hover background (subtle) */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-200" />
                )}

                <item.icon
                  size={20}
                  className={`relative z-10 transition-all duration-300 ${
                    isActive
                      ? "text-emerald-600 stroke-[2.5px] scale-110"
                      : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"
                  }`}
                />
                <span className="relative z-10 text-sm tracking-wide">
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Profile & Sign Out - Refined */}
      <div className="p-4 border-t border-gray-50 bg-gray-50/30">
        <button className="flex items-center gap-3 w-full px-4 py-3.5 text-gray-500 hover:text-red-600 hover:bg-white rounded-xl transition-all duration-300 group shadow-transparent hover:shadow-sm ring-0 hover:ring-1 ring-red-100">
          <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-red-50 transition-colors">
            <LogOut size={18} className="group-hover:stroke-red-600" />
          </div>
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
