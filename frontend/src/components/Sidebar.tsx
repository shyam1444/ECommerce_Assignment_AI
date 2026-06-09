"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Users, Tag, BarChart3,
  FileText, CheckSquare, Zap, Settings, TrendingUp, ChevronRight
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Executive Cockpit", icon: LayoutDashboard, badge: null },
  { href: "/inventory", label: "Inventory & Replenishment", icon: Package, badge: "alerts" },
  { href: "/vendors", label: "Vendor Management", icon: Users, badge: null },
  { href: "/pricing", label: "Pricing & Margin", icon: Tag, badge: null },
  { href: "/assortment", label: "Assortment Intelligence", icon: BarChart3, badge: null },
  { href: "/content", label: "Product Content AI", icon: FileText, badge: null },
  { href: "/reviews", label: "Business Review", icon: TrendingUp, badge: null },
  { href: "/approvals", label: "Task & Approvals", icon: CheckSquare, badge: "pending" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 h-full flex flex-col border-r border-white/[0.06] bg-dark-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Fixxly</p>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">CLOS Platform</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.03]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
            AJ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate">Arjun Mehta</p>
            <p className="text-[10px] text-white/40 truncate">Category Leader</p>
          </div>
          <ChevronRight size={12} className="text-white/30" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Modules
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("sidebar-link", { active: isActive })}
            >
              <Icon size={15} className={isActive ? "text-cyan-400" : "text-white/40"} />
              <span className="flex-1 text-sm">{item.label}</span>
              {item.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse-slow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <Link
          href="/settings"
          className="sidebar-link"
        >
          <Settings size={14} className="text-white/30" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
