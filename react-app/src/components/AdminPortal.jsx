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
  Lock, 
  MapPin, 
  Clock, 
  Check, 
  X,
  LogOut,
  Building2,
  FileText
} from 'lucide-react';
import { 
  getHomeChargers, 
  adminSetListingStatus, 
  deleteHomeCharger,
  getComplaints, 
  updateComplaintStatus, 
  determineComplaintRecipient,
  resolveComplaintWithRouting,
  getChargerRequests, 
  updateChargerRequestStatus, 
  getLocalFeedbackList, 
  setFeedbackReviewed,
  getAdminAuditLog,
  getAdminSession,
  setAdminSession,
  clearAdminSession
} from '../services/storageAdapter';

export default function AdminPortal({ onExit }) {
  // Prototype Admin Authentication State
  const [adminSession, setAdminSessionState] = useState(() => getAdminSession());
  const [loginName, setLoginName] = useState('Ankit Sharma');
  const [loginRole, setLoginRole] = useState('Senior Operations Administrator (Delhi NCR)');

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'complaints' | 'requests' | 'feedback' | 'audit'

  // Reactive state data
  const [allHomeChargers, setAllHomeChargers] = useState(() => getHomeChargers('all'));
  const [complaints, setComplaints] = useState(() => getComplaints());
  const [chargerRequests, setChargerRequests] = useState(() => getChargerRequests());
  const [feedbackList, setFeedbackList] = useState(() => getLocalFeedbackList());
  const [auditLogs, setAuditLogs] = useState(() => getAdminAuditLog());

  // Filters
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'declined' | 'paused'
  const [complaintFilter, setComplaintFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [requestFilter, setRequestFilter] = useState('all'); // 'all' | 'under_review' | 'planned' | 'approved' | 'rejected'

  // Modals for admin actions
  const [declineModal, setDeclineModal] = useState(null); // charger to decline
  const [declineReason, setDeclineReason] = useState('');

  // Complaint resolution modal state
  const [resolveComplaintModal, setResolveComplaintModal] = useState(null);
  const [stagedMessage, setStagedMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [viewStagedNoticeModal, setViewStagedNoticeModal] = useState(null);

  // Selected item detail view
  const [selectedListingDetail, setSelectedListingDetail] = useState(null);

  const refreshData = useCallback(() => {
    setAllHomeChargers(getHomeChargers('all'));
    setComplaints(getComplaints());
    setChargerRequests(getChargerRequests());
    setFeedbackList(getLocalFeedbackList());
    setAuditLogs(getAdminAuditLog());
  }, []);

  // Filtered homeowner chargers
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
      return matchStatus;
    });
  }, [complaints, complaintFilter]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return chargerRequests.filter(r => {
      const matchStatus = requestFilter === 'all' || r.status === requestFilter;
      return matchStatus;
    });
  }, [chargerRequests, requestFilter]);

  // Handle Prototype Sign In
  const handlePrototypeSignIn = (e) => {
    e.preventDefault();
    const session = setAdminSession({ username: loginName, role: loginRole });
    setAdminSessionState(session);
  };

  const handleSignOut = () => {
    clearAdminSession();
    setAdminSessionState(null);
  };

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
    if (window.confirm('Are you sure you want to delete this charger listing? This action will be logged in the audit trail.')) {
      deleteHomeCharger(id);
      refreshData();
      if (selectedListingDetail?.id === id) {
        setSelectedListingDetail(null);
      }
    }
  };

  // Handlers for Complaints
  const handleInvestigateComplaint = (complaintId) => {
    updateComplaintStatus(complaintId, 'in_progress', 'Technician/Liaison dispatched to investigate issue.');
    refreshData();
  };

  const handleOpenResolveModal = (comp) => {
    setResolveComplaintModal(comp);
    const target = determineComplaintRecipient(comp);
    
    // Draft formal dispatch notice
    const draft = `[OFFICIAL GRIEVANCE REDRESSAL DISPATCH]
To: ${target.recipient_name}
Department: ${target.department}
Location/Region: ${target.region}
Target Equipment: ${target.charger_title}

Grievance Reference: ${comp.id}
Category / Fault: ${comp.issue_type}
Complainant: ${comp.complainant_name} (${comp.complainant_contact || 'No contact provided'})
Date Reported: ${new Date(comp.created_at).toLocaleString()}

Issue Summary:
${comp.description}

Action Required:
${target.type === 'municipality' ? 'Please dispatch field maintenance contractor to inspect connector/bay and restore public charging operability.' : 'Please inspect your private wallbox equipment and report status back to the platform.'}

Dispatch Authority: Electrify Mobility Operations Console (Local Staging)`.trim();

    setStagedMessage(draft);
    setResolutionNotes(`Target identified as ${target.recipient_name}. Prepared dispatch notice.`);
  };

  const handleConfirmResolveComplaint = () => {
    if (!resolveComplaintModal) return;
    const target = determineComplaintRecipient(resolveComplaintModal);
    resolveComplaintWithRouting(resolveComplaintModal.id, {
      routing_target: target,
      delivery_channel: 'unconfigured_local_staging',
      resolution_notes: resolutionNotes,
      staged_message: stagedMessage,
    });
    setResolveComplaintModal(null);
    setStagedMessage('');
    setResolutionNotes('');
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

  // ==========================================================================
  // 1. PROTOTYPE SIGN-IN GATE (Visible when not authenticated)
  // ==========================================================================
  if (!adminSession) {
    return (
      <div className="min-h-dvh bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 border border-purple-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-purple-600/20 text-purple-400 border border-purple-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Electrify <span className="text-purple-400">Admin Console</span>
            </h2>
            <p className="text-xs text-gray-400">Operations, Grievance Routing & Listing Moderation</p>
          </div>

          {/* Security Disclaimer Banner */}
          <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-2xl text-[11px] text-purple-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <Lock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Prototype Security Notice (Frontend-only)</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              This sign-in is a functional demonstration prototype. Client-side checks are <strong>not a secure authentication boundary</strong>. In production, server-side authentication (e.g. Supabase/Firebase Auth with JWT validation, MFA, and Row-Level Security) is required to access administrative features.
            </p>
          </div>

          <form onSubmit={handlePrototypeSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Admin Officer Name / Call-Sign:</label>
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Administrative Role / Division:</label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Senior Operations Administrator (Delhi NCR)">Senior Operations Administrator (Delhi NCR)</option>
                <option value="Municipal Grievance Redressal Liaison">Municipal Grievance Redressal Liaison</option>
                <option value="Community Infrastructure Moderator">Community Infrastructure Moderator</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-xl transition text-xs sm:text-sm cursor-pointer shadow-lg"
            >
              Enter Admin Console (Prototype Session)
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer border border-gray-700"
            >
              Exit to Driver Map
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. AUTHENTICATED ADMIN OPERATIONS DASHBOARD
  // ==========================================================================
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

        {/* User badge and Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col text-right pr-2">
            <span className="text-xs font-bold text-purple-300">{adminSession.username}</span>
            <span className="text-[10px] text-gray-400">{adminSession.role}</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            title="Sign out of prototype session"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Exit to Driver Map</span>
          </button>
        </div>
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
            <span>Live Host Chargers</span>
            <Home className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Approved & rentable on map</p>
        </div>

        <div 
          onClick={() => { setActiveTab('complaints'); setComplaintFilter('open'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'complaints' && complaintFilter === 'open'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Open Complaints</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{openComplaintsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Faults, ICEing & access issues</p>
        </div>

        <div 
          onClick={() => { setActiveTab('requests'); setRequestFilter('under_review'); }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'requests' && requestFilter === 'under_review'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Charger Requests</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-1">{pendingRequestsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Highway & corridor suggestions</p>
        </div>
      </div>

      {/* Main Operations Container */}
      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 pb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl">
          
          {/* Operations Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-gray-800 px-4 pt-3 overflow-x-auto custom-scrollbar shrink-0">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('listings')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'listings'
                    ? 'border-purple-500 text-purple-400 bg-gray-950/40'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home Charger Listings ({allHomeChargers.length})</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('complaints')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'complaints'
                    ? 'border-purple-500 text-purple-400 bg-gray-950/40'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Complaints & Faults ({complaints.length})</span>
                {openComplaintsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {openComplaintsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'requests'
                    ? 'border-purple-500 text-purple-400 bg-gray-950/40'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Station Requests ({chargerRequests.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('feedback')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'feedback'
                    ? 'border-purple-500 text-purple-400 bg-gray-950/40'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>General Feedback ({feedbackList.length})</span>
                {unreviewedFeedbackCount > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {unreviewedFeedbackCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'audit'
                    ? 'border-purple-500 text-purple-400 bg-gray-950/40'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Trail ({auditLogs.length})</span>
              </button>
            </div>
          </div>

          {/* Operational View Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col min-h-0">
            
            {/* ================================================================ */}
            {/* TAB 1: HOMEOWNER CHARGER LISTINGS */}
            {/* ================================================================ */}
            {activeTab === 'listings' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Status Filters */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-800 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['all', 'pending', 'approved', 'declined', 'paused'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setListingFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                          listingFilter === st
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-950 text-gray-400 hover:text-gray-200 border border-gray-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Listings Cards */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3">
                  {homeChargers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                      No charger listings found for filter &ldquo;{listingFilter}&rdquo;.
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
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  charger.visibility === 'private'
                                    ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                }`}>
                                  {charger.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
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
                                <div><span className="text-gray-500">Visibility:</span> <strong>{charger.visibility === 'private' ? '🔒 Private' : '🌐 Public'}</strong></div>
                                <div><span className="text-gray-500">Privacy:</span> <strong>{charger.is_address_public ? '🌐 Public Address' : '🔒 Approximate Area'}</strong></div>
                                <div><span className="text-gray-500">Power:</span> <strong>{charger.power_kw} kW</strong></div>
                                <div><span className="text-gray-500">Connector:</span> <strong>{charger.connector}</strong></div>
                                <div><span className="text-gray-500">Schedule:</span> <strong>{charger.schedule}</strong></div>
                              </div>

                              <div className="text-[11px] bg-gray-950 p-2 rounded-lg border border-gray-800">
                                <span className="text-gray-500 font-semibold">Access Instructions: </span>
                                <span className="text-gray-300 italic">{charger.access_instructions || 'None provided'}</span>
                              </div>
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
            {/* TAB 2: COMPLAINTS & MUNICIPAL/HOST DISPATCH ROUTING */}
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
                      No complaints matching filter &ldquo;{complaintFilter}&rdquo;.
                    </div>
                  ) : (
                    filteredComplaints.map(comp => {
                      const isDeliveryPending = comp.resolution_status === 'resolved_delivery_pending';
                      const routing = comp.routing_target;

                      return (
                        <div key={comp.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 text-xs space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                  comp.status === 'resolved' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : comp.status === 'in_progress'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}>
                                  {isDeliveryPending ? 'Resolved — Delivery Pending' : comp.status.replace('_', ' ')}
                                </span>
                                
                                {routing && (
                                  <span className="text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800 px-2 py-0.5 rounded flex items-center gap-1">
                                    {routing.type === 'municipality' ? <Building2 className="w-3 h-3 text-purple-400" /> : <Home className="w-3 h-3 text-purple-400" />}
                                    <span>Routed to: {routing.recipient_name}</span>
                                  </span>
                                )}

                                <span className="text-amber-400 font-bold">{comp.issue_type}</span>
                              </div>
                              <h4 className="font-bold text-gray-200 text-sm mt-1">{comp.charger_title}</h4>
                              <p className="text-gray-400 text-[11px]">
                                Reported by {comp.complainant_name} ({comp.complainant_contact || 'No contact'}) · {new Date(comp.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Status update buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {comp.status !== 'in_progress' && comp.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleInvestigateComplaint(comp.id)}
                                  className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Investigate
                                </button>
                              )}
                              
                              {comp.status !== 'resolved' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenResolveModal(comp)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> Resolve & Route
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewStagedNoticeModal(comp)}
                                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-purple-300 border border-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Notice
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-300 bg-gray-900 p-2.5 rounded-lg border border-gray-800 leading-relaxed">
                            {comp.description}
                          </p>

                          {comp.admin_notes && (
                            <p className="text-[11px] text-purple-300">
                              <strong>Resolution Note:</strong> {comp.admin_notes}
                            </p>
                          )}
                        </div>
                      );
                    })
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
                      No station requests matching filter &ldquo;{requestFilter}&rdquo;.
                    </div>
                  ) : (
                    filteredRequests.map(req => (
                      <div key={req.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/30">
                              {req.status.replace('_', ' ')}
                            </span>
                            <h4 className="font-bold text-gray-200 text-sm mt-1">{req.location_name} ({req.region})</h4>
                            <p className="text-gray-400 text-[11px]">Requested operator: {req.suggested_operator || 'Any'} · Contact: {req.contact}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {req.status !== 'planned' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequest(req.id, 'planned')}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Mark Planned
                              </button>
                            )}
                            {req.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequest(req.id, 'approved')}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-300 bg-gray-900 p-2.5 rounded-lg border border-gray-800 leading-relaxed">
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
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {feedbackList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                      No feedback submitted yet.
                    </div>
                  ) : (
                    feedbackList.map(item => (
                      <div key={item.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-gray-800 text-gray-300 border-gray-700">
                              {item.category}
                            </span>
                            <span className="text-gray-400 text-[11px]">{new Date(item.created_at).toLocaleString()}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeedbackReviewed(item.id, item.reviewed)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              item.reviewed 
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-gray-800'
                                : 'bg-purple-600 text-white border-purple-500 hover:bg-purple-500'
                            }`}
                          >
                            {item.reviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
                          </button>
                        </div>
                        <p className="text-gray-200 bg-gray-900 p-2.5 rounded-lg border border-gray-800">{item.message}</p>
                        {item.contact && (
                          <p className="text-[11px] text-gray-400">Contact: {item.contact}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* TAB 5: AUDIT TRAIL */}
            {/* ================================================================ */}
            {activeTab === 'audit' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs italic bg-gray-950/40 rounded-xl border border-gray-800">
                      No admin actions logged yet.
                    </div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="bg-gray-950/80 border border-gray-800/80 p-3 rounded-xl text-xs flex justify-between items-start gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-400 uppercase text-[10px]">{log.action}</span>
                            <span className="text-gray-500 text-[10px]">({log.entity_type}: {log.entity_id})</span>
                          </div>
                          <p className="text-gray-300 text-xs">{log.notes}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Reason Modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-gray-100 flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" /> Decline Charger Listing
            </h3>
            <p className="text-xs text-gray-400">Provide constructive feedback to the homeowner:</p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-100 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeclineModal(null)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Resolution & Routing Dispatch Modal */}
      {resolveComplaintModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-gray-100">
                  Resolve Complaint & Route Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolveComplaintModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs custom-scrollbar">
              {(() => {
                const target = determineComplaintRecipient(resolveComplaintModal);
                return (
                  <>
                    <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                          {target.type === 'municipality' ? '🏛️ Responsible Municipality Identified' : '🏠 Private Charger Host Identified'}
                        </span>
                        <span className="text-[10px] font-bold bg-purple-900 px-2 py-0.5 rounded text-purple-200">
                          {target.region}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{target.recipient_name}</h4>
                      <p className="text-gray-400 text-xs">{target.department}</p>
                      <p className="text-purple-300 text-[11px] font-mono">Official Endpoint: {target.contact}</p>
                    </div>

                    {/* Delivery Gateway Notice */}
                    <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-200 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Delivery Channel: Unconfigured Local Staging (Frontend Prototype)
                      </p>
                      <p className="text-gray-300 leading-tight">
                        No live external email/SMS/Gov gateway is configured in this prototype. The complaint will be recorded with status <strong>Resolved — delivery pending</strong>. Resolution, delivery attempt, and delivery confirmation are kept as distinct statuses.
                      </p>
                    </div>

                    {/* Staged Message Preview */}
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">
                        Staged Dispatch Notice (Review & Edit):
                      </label>
                      <textarea
                        rows={6}
                        value={stagedMessage}
                        onChange={(e) => setStagedMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Admin Resolution Notes */}
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">
                        Internal Decision & Audit Notes:
                      </label>
                      <input
                        type="text"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="e.g. Verified latch defect with station photos. Staged formal dispatch to GMDA EV team."
                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setResolveComplaintModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolveComplaint}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Resolution (Stage as Delivery Pending)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staged Notice Modal (for already resolved complaints) */}
      {viewStagedNoticeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="font-bold text-sm text-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Staged Dispatch Notice
              </h3>
              <button
                type="button"
                onClick={() => setViewStagedNoticeModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewStagedNoticeModal.routing_target && (
              <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-xs space-y-1">
                <div><span className="text-gray-500">Recipient:</span> <strong>{viewStagedNoticeModal.routing_target.recipient_name}</strong></div>
                <div><span className="text-gray-500">Channel / Status:</span> <strong className="text-amber-400">{viewStagedNoticeModal.resolution_status?.replace(/_/g, ' ')}</strong></div>
                <div><span className="text-gray-500">Contact:</span> <strong className="font-mono text-purple-300">{viewStagedNoticeModal.routing_target.contact}</strong></div>
              </div>
            )}

            <pre className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {viewStagedNoticeModal.staged_message || 'No custom dispatch message recorded.'}
            </pre>

            <button
              type="button"
              onClick={() => setViewStagedNoticeModal(null)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-2 rounded-xl text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
