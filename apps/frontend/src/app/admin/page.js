"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, anime: 0, episodes: 0, vouchers: 0, plans: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/stats");
      if (data?.success) {
        setStats({
          users: data.data.users || 0,
          anime: data.data.anime || 0,
          episodes: data.data.episodes || 0,
          vouchers: data.data.vouchers || 0,
          plans: data.data.plans || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { title: "Total Users", value: stats.users, icon: "fa-solid fa-users", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { title: "Total Anime", value: stats.anime, icon: "fa-solid fa-film", gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
    { title: "Episodes", value: stats.episodes, icon: "fa-solid fa-play-circle", gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
    { title: "Vouchers", value: stats.vouchers, icon: "fa-solid fa-ticket", gradient: "linear-gradient(135deg, #10b981, #059669)" },
    { title: "Plans", value: stats.plans, icon: "fa-solid fa-credit-card", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  ];

  const quickLinks = [
    { title: "Manage Users", href: "/admin/users", icon: "fa-solid fa-users", color: "#3b82f6" },
    { title: "Manage Anime", href: "/admin/anime", icon: "fa-solid fa-film", color: "#8b5cf6" },
    { title: "Vouchers", href: "/admin/vouchers", icon: "fa-solid fa-ticket", color: "#10b981" },
    { title: "Schedules", href: "/admin/schedules", icon: "fa-regular fa-calendar", color: "#f59e0b" },
    { title: "Broadcasts", href: "/admin/broadcasts", icon: "fa-solid fa-bullhorn", color: "#ec4899" },
    { title: "Mappings", href: "/admin/mappings", icon: "fa-solid fa-link", color: "#6366f1" },
  ];

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back to the admin control panel.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--bg-card)]" style={{ border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
          initial="hidden" animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
          {statCards.map((stat) => (
            <motion.div
              key={stat.title}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
              className="admin-card admin-card-interactive flex items-center gap-3.5 p-5 cursor-default"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: stat.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                <i className={stat.icon} style={{ fontSize: 16 }}></i>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{stat.title}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  {stat.value?.toLocaleString("id-ID") || 0}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 20 }}
        className="admin-card p-5"
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 13 }}></i>
          Quick Links
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 rounded-lg transition-all group"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.background = `${link.color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110" style={{ background: `${link.color}15`, color: link.color }}>
                <i className={link.icon} style={{ fontSize: 14 }}></i>
              </div>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{link.title}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
