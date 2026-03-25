"use client";

import { useState, useEffect, useRef } from "react";
import adminService from "@/lib/adminApi";
import { animeService } from "@/lib/animeApi";
import Swal from "sweetalert2";

export default function AdminMappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [connectModal, setConnectModal] = useState(false);
  const [connectId, setConnectId] = useState(null);
  const [searchQueryConnect, setSearchQueryConnect] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getMappings({ page, limit: 15, status: statusFilter, search: searchQuery });
      setMappings(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch mappings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, [page, statusFilter, searchQuery]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearchQuery(search); };

  const swalOpts = { background: "var(--bg-card)", color: "var(--text-primary)" };

  const handleApprove = async (mappingId, candidateId) => {
    try {
      await adminService.approveMapping(mappingId, candidateId);
      Swal.fire({ icon: "success", title: "Approved!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed", ...swalOpts });
    }
  };

  const handleIgnore = async (mappingId) => {
    const r = await Swal.fire({ title: "Ignore?", text: "Mapping ini akan diabaikan.", icon: "warning", showCancelButton: true, confirmButtonColor: "var(--accent)", cancelButtonColor: "#ef4444", confirmButtonText: "Ya, Ignore!", cancelButtonText: "Batal", ...swalOpts });
    if (!r.isConfirmed) return;
    try {
      await adminService.ignoreMapping(mappingId);
      Swal.fire({ icon: "success", title: "Ignored", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to ignore", ...swalOpts });
    }
  };

  const handleManualConnectSearch = (query) => {
    setSearchQueryConnect(query);
    if (!query.trim()) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await animeService.searchAnime(query, 1, 10);
        setSearchResults(res.data || []);
      } catch { } finally { setIsSearching(false); }
    }, 500);
  };

  const handleManualConnectSelect = async (koleksiId) => {
    try {
      await adminService.manualConnectMapping(connectId, koleksiId);
      setConnectModal(false);
      Swal.fire({ icon: "success", title: "Connected!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, ...swalOpts });
      fetchMappings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed", ...swalOpts });
    }
  };

  const statusBadge = (s) => {
    const map = {
      pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)', icon: 'fa-clock' },
      resolved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)', icon: 'fa-check-circle' },
      ignored: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)', icon: 'fa-ban' },
    };
    const c = map[s] || map.pending;
    return (
      <span className="admin-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
        <i className={`fa-solid ${c.icon}`} style={{ fontSize: 9 }}></i> {s}
      </span>
    );
  };

  const tabBtn = (s) => (
    <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
      className="admin-btn capitalize" style={{
        fontSize: 12, padding: '6px 14px',
        background: statusFilter === s ? 'var(--accent)' : 'var(--bg-input)',
        color: statusFilter === s ? 'white' : 'var(--text-secondary)',
        boxShadow: statusFilter === s ? '0 2px 8px rgba(var(--accent-rgb,236,72,153),0.3)' : 'none',
      }}>
      {s}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h2><i className="fa-solid fa-link mr-2" style={{ fontSize: 18, color: 'var(--accent)' }}></i>Anime Mappings</h2>
          <p>Review & approve/ignore provider mappings.</p>
        </div>
        <div className="flex gap-1.5">{["pending", "resolved", "ignored"].map(tabBtn)}</div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, slug, or title..." className="admin-input" style={{ paddingLeft: 34 }} />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary">
          <i className="fa-solid fa-search" style={{ fontSize: 11 }}></i> Search
        </button>
      </form>

      {/* List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="admin-card px-6 py-10 text-center text-[var(--text-tertiary)]">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...
          </div>
        ) : mappings.length === 0 ? (
          <div className="admin-card px-6 py-10 text-center text-[var(--text-tertiary)]" style={{ borderStyle: 'dashed' }}>
            <i className="fa-solid fa-inbox mr-2" style={{ fontSize: 16 }}></i>No "{statusFilter}" mappings found.
          </div>
        ) : (
          mappings.map((m) => (
            <div key={m.id} className="admin-card overflow-hidden">
              {/* Row */}
              <div className="flex items-center justify-between gap-3 p-3.5 cursor-pointer transition-colors" style={{ ':hover': { background: 'var(--bg-card-hover)' } }}
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(var(--accent-rgb,236,72,153),0.1)' }}>
                    <i className="fa-solid fa-link" style={{ fontSize: 13, color: 'var(--accent)' }}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">
                      {m.scrapedTitle || m.sourceIdOrSlug || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase text-[var(--accent)]">{m.sourceName || "Unknown"}</span>
                      {m.scrapedTitle && m.sourceIdOrSlug && <span className="text-[10px] text-[var(--text-tertiary)]">• {m.sourceIdOrSlug}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {statusBadge(m.status)}
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                      {m.candidates?.length || 0} candidate{m.candidates?.length !== 1 ? "s" : ""}
                    </span>
                    {m.candidates?.length > 0 && typeof m.candidates[0]?.similarityScore !== 'undefined' && (
                      <span className="text-[10px] font-bold text-[var(--accent)] mt-0.5">
                        Top: {(parseFloat(m.candidates[0].similarityScore) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <i className={`fa-solid fa-chevron-down text-[var(--text-tertiary)] transition-transform ${expandedId === m.id ? 'rotate-180' : ''}`} style={{ fontSize: 11 }}></i>
                </div>
              </div>

              {/* Expanded */}
              {expandedId === m.id && (
                <div className="p-3.5 space-y-2.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                  {/* Linked Koleksi */}
                  {m.koleksi && (
                    <div className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      {m.koleksi.posterUrl && <img src={m.koleksi.posterUrl} alt="" className="h-10 w-7 rounded object-cover" />}
                      <div>
                        <p className="text-[10px] font-bold uppercase" style={{ color: '#10b981' }}>
                          <i className="fa-solid fa-check-circle mr-1" style={{ fontSize: 9 }}></i>Linked Koleksi
                        </p>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{m.koleksi.title}</p>
                      </div>
                    </div>
                  )}

                  {/* Candidates */}
                  {m.candidates?.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        <i className="fa-solid fa-list-check mr-1" style={{ fontSize: 9 }}></i>Candidates
                      </p>
                      {m.candidates.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                              {c.similarityScore ? `${(parseFloat(c.similarityScore) * 100).toFixed(0)}%` : "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{c.targetTitle || "Unknown"}</p>
                              <div className="flex gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                                <span>AL: {c.targetAnilistId}</span>
                                {c.targetFormat && <span>• {c.targetFormat}</span>}
                                {c.targetReleaseYear && <span>• {c.targetReleaseYear}</span>}
                              </div>
                            </div>
                          </div>
                          {m.status === "pending" && (
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(m.id, c.id); }} className="admin-btn" style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                              <i className="fa-solid fa-check" style={{ fontSize: 9 }}></i> Approve
                            </button>
                          )}
                          {c.isApproved && (
                            <span className="admin-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                              <i className="fa-solid fa-check" style={{ fontSize: 8 }}></i> Approved
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg px-4 py-6 text-center" style={{ border: '1px dashed var(--border)', background: 'var(--bg-card)' }}>
                      <p className="text-[12px] font-medium text-[var(--text-secondary)]">No automatic matches found.</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Use <strong>Manual Connect</strong> below.</p>
                    </div>
                  )}

                  {/* Actions */}
                  {m.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleIgnore(m.id)} className="admin-btn" style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <i className="fa-solid fa-ban" style={{ fontSize: 10 }}></i> Ignore
                      </button>
                      <button onClick={() => { setConnectId(m.id); setSearchQueryConnect(""); setSearchResults([]); setConnectModal(true); }} className="admin-btn" style={{ fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-plug" style={{ fontSize: 10 }}></i> Manual Connect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
          <i className="fa-solid fa-chevron-left" style={{ fontSize: 10 }}></i> Prev
        </button>
        <span className="text-xs font-medium text-[var(--text-tertiary)]">Page {page} of {Math.max(1, totalPages)}</span>
        <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
          Next <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }}></i>
        </button>
      </div>

      {/* Manual Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg admin-card p-5 flex flex-col max-h-[80vh]" style={{ boxShadow: 'var(--admin-shadow-lg)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <i className="fa-solid fa-plug" style={{ color: 'var(--accent)', fontSize: 14 }}></i>
                Manual Connect
              </h3>
              <button onClick={() => setConnectModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                <i className="fa-solid fa-xmark" style={{ fontSize: 16 }}></i>
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ fontSize: 12 }}></i>
                <input type="text" value={searchQueryConnect} onChange={(e) => handleManualConnectSearch(e.target.value)} placeholder="Search anime..." className="admin-input" style={{ paddingLeft: 34 }} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {isSearching ? (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4">
                    <i className="fa-solid fa-spinner fa-spin mr-1"></i>Searching...
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map(anime => (
                    <div key={anime.id} onClick={() => handleManualConnectSelect(anime.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all"
                      style={{ border: '1px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(var(--accent-rgb,236,72,153),0.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {anime.posterUrl ? (
                        <img src={anime.posterUrl} alt="" className="w-9 h-12 object-cover rounded" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                      ) : (
                        <div className="w-9 h-12 bg-[var(--bg-input)] rounded flex items-center justify-center">
                          <i className="fa-solid fa-image text-[var(--text-tertiary)]" style={{ fontSize: 10 }}></i>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[12px] text-[var(--text-primary)] truncate">{anime.title}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{anime.type}</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{anime.status}</span>
                        </div>
                      </div>
                      <span className="admin-btn shrink-0" style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(var(--accent-rgb,236,72,153),0.1)', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-plug" style={{ fontSize: 9 }}></i> Connect
                      </span>
                    </div>
                  ))
                ) : searchQueryConnect.trim() ? (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4">No anime found.</p>
                ) : (
                  <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4 italic">
                    <i className="fa-solid fa-keyboard mr-1" style={{ fontSize: 11 }}></i>Type to search anime in database.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
