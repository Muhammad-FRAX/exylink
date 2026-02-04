import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, LogOut } from "lucide-react";
import logo from "../assets/exylink-logo.png";

export default function Sidebar() {
  const navItems = [
    { name: "Home", path: "/", icon: LayoutDashboard },
    { name: "Data Connections", path: "/connections", icon: Database },
  ];

  return (
    <aside className="h-screen w-72 bg-white border-r border-gray-100 flex flex-col shadow-xl z-50">
      {/* Header */}
      <div className="p-6 flex items-center gap-3">
        <img
          src={logo}
          alt="Exylink Logo"
          className="w-10 h-10 object-contain"
        />
        <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Exylink
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-lg" />
                )}
                <item.icon
                  size={22}
                  className={`transition-colors duration-300 ${
                    isActive
                      ? "text-emerald-600"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                <span className="relative z-10">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Sign Out */}
      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 w-full px-4 py-3.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 group">
          <LogOut size={22} className="group-hover:stroke-red-600" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
