import { useState, useMemo, useCallback } from 'react';
import { 
  Shield, 
  Home, 
  AlertTriangle, 
  Zap, 
  MessageSquare, 
  History, 
  Pause, 
  Play, 
  Trash2, 
  ArrowLeft, 
  Search, 
  Lock, 
  MapPin, 
  Clock, 
  Check, 
  X
} from 'lucide-react';
import { 
  getHomeChargers, 
  adminSetListingStatus, 
  deleteHomeCharger,
  getComplaints, 
  updateComplaintStatus, 
  getChargerRequests, 
  updateChargerRequestStatus, 
  getLocalFeedbackList, 
  setFeedbackReviewed,
  getAdminAuditLog
} from '../services/storageAdapter';

export default function AdminPortal({ onExit }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'complaints' | 'requests' | 'feedback' | 'audit'

  // Reactive state data directly stored in state
  const [allHomeChargers, setAllHomeChargers] = useState(() => getHomeChargers('all'));
  const [complaints, setComplaints] = useState(() => getComplaints());
  const [chargerRequests, setChargerRequests] = useState(() => getChargerRequests());
  const [feedbackList, setFeedbackList] = useState(() => getLocalFeedbackList());
  const [auditLogs, setAuditLogs] = useState(() => getAdminAuditLog());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'declined' | 'paused'
  const [complaintFilter, setComplaintFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [requestFilter, setRequestFilter] = useState('all'); // 'all' | 'under_review' | 'planned' | 'approved' | 'rejected'

  // Modals for admin actions
  const [declineModal, setDeclineModal] = useState(null); // charger to decline
  const [declineReason, setDeclineReason] = useState('');

  // Selected item detail view
  const [selectedListingDetail, setSelectedListingDetail] = useState(null);

  const refreshData = useCallback(() => {
    setAllHomeChargers(getHomeChargers('all'));
    setComplaints(getComplaints());
    setChargerRequests(getChargerRequests());
    setFeedbackList(getLocalFeedbackList());
    setAuditLogs(getAdminAuditLog());
  }, []);

  // Filtered homeowner chargers based on listingFilter
  const homeChargers = useMemo(() => {
    if (listingFilter === 'all') return allHomeChargers;
    return allHomeChargers.filter(c => c.status === listingFilter);
  }, [allHomeChargers, listingFilter]);

  // Quick stats
  const pendingCount = allHomeChargers.filter(c => c.status === 'pending').length;
  const approvedCount = allHomeChargers.filter(c => c.status === 'approved').length;
  const openComplaintsCount = complaints.filter(c => c.status === 'open').length;
  const pendingRequestsCount = chargerRequests.filter(r => r.status === 'under_review').length;
  const unreviewedFeedbackCount = feedbackList.filter(f => !f.reviewed).length;

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchStatus = complaintFilter === 'all' || c.status === complaintFilter;
      const matchSearch = (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.charger_title || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [complaints, complaintFilter, searchQuery]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return chargerRequests.filter(r => {
      const matchStatus = requestFilter === 'all' || r.status === requestFilter;
      const matchSearch = (r.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [chargerRequests, requestFilter, searchQuery]);

  // Handlers for Listing Actions
  const handleApproveListing = (charger) => {
    adminSetListingStatus(charger.id, 'approved', 'Approved by administrator');
    refreshData();
  };

  const handleOpenDeclineModal = (charger) => {
    setDeclineModal(charger);
    setDeclineReason('Please provide more specific entry instructions and confirm connector compatibility.');
  };

  const handleConfirmDecline = () => {
    if (!declineModal) return;
    adminSetListingStatus(declineModal.id, 'declined', declineReason);
    setDeclineModal(null);
    setDeclineReason('');
    refreshData();
  };

  const handleTogglePause = (charger) => {
    const nextStatus = charger.status === 'paused' ? 'approved' : 'paused';
    adminSetListingStatus(charger.id, nextStatus, `Status switched to ${nextStatus} by admin`);
    refreshData();
  };

  const handleDeleteListing = (id) => {
    if (window.confirm('Are you sure you want to delete this charger listing? This action will be logged.')) {
      deleteHomeCharger(id);
      refreshData();
      if (selectedListingDetail?.id === id) {
        setSelectedListingDetail(null);
      }
    }
  };

  // Handlers for Complaints
  const handleUpdateComplaint = (complaintId, status) => {
    updateComplaintStatus(complaintId, status, `Status changed to ${status}`);
    refreshData();
  };

  // Handlers for Public Charger Requests
  const handleUpdateRequest = (requestId, status) => {
    updateChargerRequestStatus(requestId, status, `Marked as ${status}`);
    refreshData();
  };

  // Handlers for Feedback
  const handleToggleFeedbackReviewed = (feedbackId, currentReviewed) => {
    setFeedbackReviewed(feedbackId, !currentReviewed);
    refreshData();
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-gray-100 flex flex-col font-sans">
      {/* Top Admin Header Bar */}
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">
                Electrify <span className="text-purple-400">Admin Portal</span>
              </h1>
              <span className="text-[10px] bg-purple-950 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-800">
                Operations & Moderation
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">Manage private charger rentals, community reports & requests</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Exit to Driver Map</span>
        </button>
      </header>

      {/* Security & Prototype Architecture Banner */}
      <div className="bg-purple-950/40 border-b border-purple-500/20 px-4 sm:px-8 py-2 text-xs text-purple-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>Prototype Security Boundary: </strong> 
            This portal demonstrates admin workflows locally in your browser. In production, server-side auth (Supabase/Firebase with RLS) will enforce admin privileges and protect private host contact details.
          </span>
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">Local Storage Mode</span>
      </div>

      {/* Admin KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-8 sm:pt-6 shrink-0">
        <div 
          onClick={() => { setActiveTab('listings'); setListingFilter('pending'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'listings' && listingFilter === 'pending'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Pending Listings</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Require review before map display</p>
        </div>

        <div 
          onClick={() => { setActiveTab('listings'); setListingFilter('approved'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'listings' && listingFilter === 'approved'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Active Home Chargers</span>
            <Home className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Live on public driver map</p>
        </div>

        <div 
          onClick={() => { setActiveTab('complaints'); setComplaintFilter('open'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'complaints'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Open Complaints</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{openComplaintsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Broken equipment & issues</p>
        </div>

        <div 
          onClick={() => { setActiveTab('requests'); setRequestFilter('under_review'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>New Charger Requests</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-1">{pendingRequestsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Community location suggestions</p>
        </div>
      </div>

      {/* Main Admin Content Area */}
      <div className="flex-1 flex flex-col sm:flex-row sm:px-8 pb-6 gap-6 min-h-0 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full sm:w-64 bg-gray-900 border-y sm:border border-gray-800 sm:rounded-2xl flex sm:flex-col shrink-0 p-2 sm:p-3 overflow-x-auto sm:overflow-x-visible gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('listings'); setSelectedListingDetail(null); }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeTab === 'listings'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Home className="w-4 h-4" /> Home Charger Listings
            </span>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeTab === 'complaints'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Complaints & Issues
            </span>
            {openComplaintsCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {openComplaintsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeTab === 'requests'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Public Charger Requests
            </span>
            {pendingRequestsCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeTab === 'feedback'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> General Feedback
            </span>
            {unreviewedFeedbackCount > 0 && (
              <span className="bg-emerald-500 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {unreviewedFeedbackCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" /> Decision Audit Log
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{auditLogs.length}</span>
          </button>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 bg-gray-900 border border-gray-800 sm:rounded-2xl p-4 sm:p-6 flex flex-col min-h-0 overflow-hidden shadow-xl">
          
          {/* ================================================================ */}
          {/* TAB 1: HOME CHARGER LISTINGS */}
          {/* ================================================================ */}
          {activeTab === 'listings' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Controls: Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'All Listings' },
                    { id: 'pending', label: '⏳ Pending Review' },
                    { id: 'approved', label: '🟢 Approved' },
                    { id: 'declined', label: '🔴 Declined' },
                    { id: 'paused', label: '⏸️ Paused' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setListingFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        listingFilter === f.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-950 text-gray-400 hover:text-gray-200 border border-gray-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search host or address..."
                    className="pl-8 pr-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Listings Table / Cards */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3">
                {homeChargers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No charger listings found for filter "{listingFilter}".
                  </div>
                ) : (
                  homeChargers.map(charger => {
                    const statusBadge = charger.status === 'approved'
                      ? { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                      : charger.status === 'pending'
                      ? { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
                      : charger.status === 'declined'
                      ? { label: 'Declined', color: 'bg-red-500/10 text-red-400 border-red-500/30' }
                      : { label: 'Paused', color: 'bg-gray-500/10 text-gray-400 border-gray-700' };

                    return (
                      <div 
                        key={charger.id}
                        className="bg-gray-950/70 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition text-xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                              <span className="text-[10px] font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/60">
                                {charger.price}
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                Submitted {new Date(charger.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-100 text-sm mt-1">{charger.title}</h3>
                            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{charger.exact_address}</span>
                            </p>
                          </div>

                          {/* Admin Decision Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                            {charger.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveListing(charger)}
                                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeclineModal(charger)}
                                  className="flex items-center gap-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/30 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" /> Decline
                                </button>
                              </>
                            )}

                            {charger.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleTogglePause(charger)}
                                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 transition cursor-pointer"
                                title="Pause listing"
                              >
                                <Pause className="w-3.5 h-3.5" /> Pause
                              </button>
                            )}

                            {charger.status === 'paused' && (
                              <button
                                type="button"
                                onClick={() => handleTogglePause(charger)}
                                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-emerald-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 transition cursor-pointer"
                                title="Resume listing"
                              >
                                <Play className="w-3.5 h-3.5" /> Resume
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedListingDetail(selectedListingDetail?.id === charger.id ? null : charger)}
                              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-gray-700"
                            >
                              {selectedListingDetail?.id === charger.id ? 'Hide Details' : 'Details'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteListing(charger.id)}
                              className="p-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 rounded-lg transition cursor-pointer"
                              title="Delete listing permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Listing Detail View */}
                        {selectedListingDetail?.id === charger.id && (
                          <div className="mt-3 pt-3 border-t border-gray-800 bg-gray-900/80 p-3 rounded-xl space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              <div><span className="text-gray-500">Host Name:</span> <strong>{charger.owner_name}</strong></div>
                              <div><span className="text-gray-500">Host Contact:</span> <strong className="font-mono text-purple-300">{charger.owner_contact}</strong></div>
                              <div><span className="text-gray-500">Privacy:</span> <strong>{charger.is_address_public ? '🌐 Public Address' : '🔒 Approximate Area'}</strong></div>
                              <div><span className="text-gray-500">Power:</span> <strong>{charger.power_kw} kW</strong></div>
                              <div><span className="text-gray-500">Connector:</span> <strong>{charger.connector}</strong></div>
                              <div><span className="text-gray-500">Schedule:</span> <strong>{charger.schedule}</strong></div>
                            </div>

                            <div className="text-[11px] bg-gray-950 p-2 rounded-lg border border-gray-800">
                              <span className="text-gray-500 font-semibold">Access Instructions: </span>
                              <span className="text-gray-300 italic">{charger.access_instructions || 'None provided'}</span>
                            </div>

                            {charger.admin_notes && (
                              <div className="text-[11px] bg-purple-950/40 p-2 rounded-lg border border-purple-800/40 text-purple-300">
                                <span className="font-bold">Admin Audit Notes: </span>
                                <span>{charger.admin_notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: COMPLAINTS */}
          {/* ================================================================ */}
          {activeTab === 'complaints' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  {['all', 'open', 'in_progress', 'resolved'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setComplaintFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                        complaintFilter === st
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-950 text-gray-400 hover:text-gray-200 border border-gray-800'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3">
                {filteredComplaints.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No complaints matching filter "{complaintFilter}".
                  </div>
                ) : (
                  filteredComplaints.map(comp => (
                    <div key={comp.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              comp.status === 'resolved' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : comp.status === 'in_progress'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>
                              {comp.status.replace('_', ' ')}
                            </span>
                            <span className="text-amber-400 font-bold">{comp.issue_type}</span>
                          </div>
                          <h4 className="font-bold text-gray-200 text-sm mt-1">{comp.charger_title}</h4>
                          <p className="text-gray-400 text-[11px]">Reported by {comp.complainant_name} ({comp.complainant_contact || 'No contact'}) · {new Date(comp.created_at).toLocaleDateString()}</p>
                        </div>

                        {/* Status update buttons */}
                        <div className="flex items-center gap-1.5">
                          {comp.status !== 'in_progress' && comp.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateComplaint(comp.id, 'in_progress')}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Investigate
                            </button>
                          )}
                          {comp.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateComplaint(comp.id, 'resolved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 bg-gray-900 p-2.5 rounded-lg border border-gray-800 leading-relaxed">
                        {comp.description}
                      </p>

                      {comp.admin_notes && (
                        <p className="text-[11px] text-purple-300 italic">
                          <strong>Admin Note:</strong> {comp.admin_notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: PUBLIC CHARGER REQUESTS */}
          {/* ================================================================ */}
          {activeTab === 'requests' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all', 'under_review', 'planned', 'approved', 'rejected'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRequestFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                        requestFilter === st
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-950 text-gray-400 hover:text-gray-200 border border-gray-800'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No charger requests matching filter "{requestFilter}".
                  </div>
                ) : (
                  filteredRequests.map(req => (
                    <div key={req.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                              {req.status.replace('_', ' ')}
                            </span>
                            <span className="text-gray-400">{req.region || 'Delhi NCR'}</span>
                          </div>
                          <h4 className="font-bold text-gray-100 text-sm mt-1">{req.location_name}</h4>
                          <p className="text-gray-400 text-[11px]">Suggested Operator: {req.suggested_operator || 'Any'} · Contact: {req.contact || 'Anonymous'}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {req.status === 'under_review' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateRequest(req.id, 'planned')}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Mark Planned
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateRequest(req.id, 'approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 bg-gray-900 p-2 rounded-lg border border-gray-800">
                        {req.notes}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: GENERAL FEEDBACK */}
          {/* ================================================================ */}
          {activeTab === 'feedback' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="pb-3 border-b border-gray-800 flex justify-between items-center text-xs text-gray-400 shrink-0">
                <span>Community Feedback & Suggestions ({feedbackList.length})</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3">
                {feedbackList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No feedback recorded yet.
                  </div>
                ) : (
                  feedbackList.map(item => (
                    <div key={item.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-800 text-purple-300 border border-gray-700">
                            {item.category.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500 text-[10px]">{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFeedbackReviewed(item.id, item.reviewed)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            item.reviewed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {item.reviewed ? '✓ Reviewed' : 'Mark as Reviewed'}
                        </button>
                      </div>

                      <p className="text-gray-200 leading-relaxed bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                        {item.message}
                      </p>
                      {item.contact && (
                        <p className="text-[11px] text-gray-500">Contact: {item.contact}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: DECISION AUDIT LOG */}
          {/* ================================================================ */}
          {activeTab === 'audit' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="pb-3 border-b border-gray-800 flex justify-between items-center text-xs text-gray-400 shrink-0">
                <span>Administrative Decision Audit Trail ({auditLogs.length} events logged)</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                    No decisions recorded in this browser session yet.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-xs flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-purple-400 font-bold text-[11px]">{log.action}</span>
                          <span className="text-[10px] text-gray-500 font-mono">[{log.entity_type} #{String(log.entity_id).slice(-6)}]</span>
                        </div>
                        <p className="text-gray-300 text-[11px] mt-0.5">{log.notes}</p>
                      </div>
                      <div className="text-right text-[10px] text-gray-500 shrink-0">
                        <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                        <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Decline Reason Modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 relative shadow-2xl">
            <button
              type="button"
              onClick={() => setDeclineModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base text-gray-100 mb-1">Decline Charger Listing</h3>
            <p className="text-xs text-gray-400 mb-3">{declineModal.title}</p>

            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Reason / Feedback for Homeowner
            </label>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-red-500 resize-none mb-4"
              placeholder="Explain why the listing was declined and what the homeowner should update..."
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeclineModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
