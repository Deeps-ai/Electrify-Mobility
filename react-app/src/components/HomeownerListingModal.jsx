import { useState } from 'react';
import { 
  X, 
  Home, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Eye, 
  EyeOff, 
  Trash2, 
  Pause, 
  Play, 
  Edit3, 
  Calendar
} from 'lucide-react';
import { 
  addHomeCharger, 
  updateHomeCharger, 
  deleteHomeCharger, 
  getBookingRequests, 
  updateBookingStatus 
} from '../services/storageAdapter';

const REGION_COORDINATES = {
  Delhi: { lat: 28.5800, lng: 77.2000 },
  Gurugram: { lat: 28.4500, lng: 77.0500 },
  Noida: { lat: 28.5700, lng: 77.3500 },
  Ghaziabad: { lat: 28.6500, lng: 77.3800 },
};

export default function HomeownerListingModal({ 
  isOpen, 
  onClose, 
  homeChargers = [], 
  onRefresh 
}) {
  const [activeTab, setActiveTab] = useState('list_new'); // 'list_new' | 'my_listings'
  
  // Form fields
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [region, setRegion] = useState('Gurugram');
  const [exactAddress, setExactAddress] = useState('');
  const [approxAddress, setApproxAddress] = useState('');
  const [isAddressPublic, setIsAddressPublic] = useState(false);
  const [connector, setConnector] = useState('Type 2 AC');
  const [powerKw, setPowerKw] = useState('7.4');
  const [priceNum, setPriceNum] = useState('14');
  const [priceUnit, setPriceUnit] = useState('kWh');
  const [schedule, setSchedule] = useState('Daily: 8:00 AM – 8:00 PM');
  const [accessInstructions, setAccessInstructions] = useState('');

  // Status/feedback
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Bookings list state
  const [selectedChargerBookings, setSelectedChargerBookings] = useState(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setOwnerName('');
    setOwnerContact('');
    setRegion('Gurugram');
    setExactAddress('');
    setApproxAddress('');
    setIsAddressPublic(false);
    setConnector('Type 2 AC');
    setPowerKw('7.4');
    setPriceNum('14');
    setPriceUnit('kWh');
    setSchedule('Daily: 8:00 AM – 8:00 PM');
    setAccessInstructions('');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleStartEdit = (charger) => {
    setEditingId(charger.id);
    setTitle(charger.title || '');
    setOwnerName(charger.owner_name || '');
    setOwnerContact(charger.owner_contact || '');
    setRegion(charger.region || 'Gurugram');
    setExactAddress(charger.exact_address || '');
    setApproxAddress(charger.approx_address || '');
    setIsAddressPublic(Boolean(charger.is_address_public));
    setConnector(charger.connector || 'Type 2 AC');
    setPowerKw(String(charger.power_kw || '7.4'));
    setPriceNum(String(charger.price_num || '14'));
    setPriceUnit(charger.price_unit || 'kWh');
    setSchedule(charger.schedule || '');
    setAccessInstructions(charger.access_instructions || '');
    setActiveTab('list_new');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const coords = REGION_COORDINATES[region] || { lat: 28.5355, lng: 77.2000 };

    if (editingId) {
      const formattedPrice = priceUnit === 'kWh' ? `₹${Number(priceNum).toFixed(2)} / kWh` : priceUnit === 'hour' ? `₹${Number(priceNum).toFixed(2)} / hr` : `₹${Number(priceNum).toFixed(2)} / session`;

      const res = updateHomeCharger(editingId, {
        title,
        owner_name: ownerName,
        owner_contact: ownerContact,
        region,
        exact_address: exactAddress,
        approx_address: approxAddress || `${region} (Approximate area)`,
        is_address_public: isAddressPublic,
        connector,
        power_kw: Number(powerKw),
        price: formattedPrice,
        price_num: Number(priceNum),
        price_unit: priceUnit,
        schedule,
        access_instructions: accessInstructions,
      });

      if (!res.success) {
        setFormError(res.message);
        return;
      }

      setFormSuccess('Listing updated successfully!');
      onRefresh?.();
      setTimeout(() => {
        resetForm();
        setActiveTab('my_listings');
      }, 1200);
      return;
    }

    // Add new charger
    const res = addHomeCharger({
      title,
      owner_name: ownerName,
      owner_contact: ownerContact,
      region,
      exact_address: exactAddress,
      approx_address: approxAddress || `${region} (Approximate area)`,
      is_address_public: isAddressPublic,
      lat: coords.lat,
      lng: coords.lng,
      connector,
      power_kw: powerKw,
      price_num: priceNum,
      price_unit: priceUnit,
      schedule,
      access_instructions: accessInstructions,
    });

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    setFormSuccess(res.message);
    onRefresh?.();
    setTimeout(() => {
      resetForm();
      setActiveTab('my_listings');
    }, 1800);
  };

  const handleTogglePause = (charger) => {
    const nextStatus = charger.status === 'paused' ? 'approved' : 'paused';
    updateHomeCharger(charger.id, { status: nextStatus });
    onRefresh?.();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this charger listing?')) {
      deleteHomeCharger(id);
      onRefresh?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 relative shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Close Button */}
        <button 
          type="button"
          onClick={() => { resetForm(); onClose(); }} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-gray-100">
              Rent Your Home EV Charger
            </h3>
            <p className="text-xs text-gray-400">Share your home charger with community drivers & earn</p>
          </div>
        </div>

        {/* Tabs: List New vs My Listings */}
        <div className="flex border-b border-gray-800 mt-3 mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('list_new'); setSelectedChargerBookings(null); }}
            className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'list_new'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {editingId ? 'Edit Charger Listing' : 'List a New Charger'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('my_listings'); setSelectedChargerBookings(null); }}
            className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_listings'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>My Listed Chargers</span>
            <span className="bg-gray-800 text-gray-300 text-[10px] px-1.5 py-0.2 rounded-full border border-gray-700">
              {homeChargers.length}
            </span>
          </button>
        </div>

        {/* TAB 1: FORM */}
        {activeTab === 'list_new' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {/* Info notice about listing approval */}
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300 mb-4 flex items-start gap-2">
              <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Listing Review Policy: </span>
                All private chargers are placed in <strong className="underline">Pending review</strong> initially. An administrator verifies the details in the Admin Portal before approving it for public EV driver discovery.
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Host Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Vikram Mehta"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Phone / WhatsApp Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerContact}
                    onChange={(e) => setOwnerContact(e.target.value)}
                    placeholder="+91 98101 23456"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Charger Title & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Charger Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Vikram's 7.4kW Fast Home Charger"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    NCR Region *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Delhi">Delhi</option>
                    <option value="Gurugram">Gurugram</option>
                    <option value="Noida">Noida</option>
                    <option value="Ghaziabad">Ghaziabad</option>
                  </select>
                </div>
              </div>

              {/* Exact Address */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Complete Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={exactAddress}
                  onChange={(e) => setExactAddress(e.target.value)}
                  placeholder="e.g. Villa 24, Palm Drive, Sector 66, Gurugram"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Location Privacy Options */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    {isAddressPublic ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-purple-400" />}
                    Location Privacy
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!isAddressPublic}
                      onChange={(e) => setIsAddressPublic(!e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-gray-400 leading-tight">
                  {!isAddressPublic 
                    ? '🔒 Exact address is hidden from the public map. EV drivers see only your approximate neighborhood until you confirm their booking request.' 
                    : '🌐 Exact address will be visible on the public map to all EV drivers.'}
                </p>

                {!isAddressPublic && (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                      Public Approximate Neighborhood / Landmark (Shown to drivers):
                    </label>
                    <input
                      type="text"
                      value={approxAddress}
                      onChange={(e) => setApproxAddress(e.target.value)}
                      placeholder="e.g. Near Sector 66, Golf Course Ext Road, Gurugram"
                      className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Specs: Connector, Power, Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Connector Type *
                  </label>
                  <select
                    value={connector}
                    onChange={(e) => setConnector(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Type 2 AC">Type 2 AC (Mennekes)</option>
                    <option value="15A 3-Pin / Type 2">15A 3-Pin Socket</option>
                    <option value="CCS-2">CCS-2 DC</option>
                    <option value="Bharat AC-001">Bharat AC-001</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Power (kW) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    required
                    value={powerKw}
                    onChange={(e) => setPowerKw(e.target.value)}
                    placeholder="7.4"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Price & Unit *
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={priceNum}
                      onChange={(e) => setPriceNum(e.target.value)}
                      placeholder="14"
                      className="w-1/2 px-2 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      className="w-1/2 px-1 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="kWh">₹ / kWh</option>
                      <option value="hour">₹ / hr</option>
                      <option value="session">₹ / flat</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Schedule and Access Instructions */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Availability Schedule
                </label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="e.g. Daily: 8:00 AM – 8:00 PM, or Weekends only"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Access & Parking Instructions
                </label>
                <textarea
                  rows={2}
                  value={accessInstructions}
                  onChange={(e) => setAccessInstructions(e.target.value)}
                  placeholder="e.g. Ring bell at main gate, park in bay 1 on the left. Long cable available."
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer shadow-lg text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> 
                  {editingId ? 'Save Changes' : 'Submit Charger for Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY LISTINGS */}
        {activeTab === 'my_listings' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
            {homeChargers.length === 0 ? (
              <div className="text-center py-10 bg-gray-950/40 rounded-2xl border border-gray-800 p-6">
                <Home className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-200">No Chargers Listed Yet</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Earn extra income by renting out your private home EV charger to nearby drivers when you are not using it.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('list_new')}
                  className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  + List Your First Charger
                </button>
              </div>
            ) : (
              homeChargers.map(charger => {
                const statusBadge = charger.status === 'approved'
                  ? { label: '🟢 Approved & Live', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                  : charger.status === 'pending'
                  ? { label: '⏳ Pending Admin Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
                  : charger.status === 'declined'
                  ? { label: '🔴 Declined', color: 'bg-red-500/10 text-red-400 border-red-500/30' }
                  : { label: '⏸️ Paused', color: 'bg-gray-500/10 text-gray-400 border-gray-600' };

                const chargerBookings = getBookingRequests(charger.id);

                return (
                  <div key={charger.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                            {charger.price}
                          </span>
                          {!charger.is_address_public && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              🔒 Location Private
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-100 text-sm mt-1">{charger.title}</h4>
                        <p className="text-gray-400 text-xs">
                          {charger.is_address_public ? charger.exact_address : `${charger.approx_address} (Public approximate)`}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {charger.status === 'approved' || charger.status === 'paused' ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(charger)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition cursor-pointer"
                            title={charger.status === 'paused' ? 'Resume availability' : 'Pause availability'}
                          >
                            {charger.status === 'paused' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(charger)}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition cursor-pointer"
                          title="Edit listing details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(charger.id)}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 rounded-lg transition cursor-pointer"
                          title="Delete listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Status note if pending or declined */}
                    {charger.status === 'pending' && (
                      <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded-lg text-[11px] text-amber-300 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Submitted for review. The charger will appear on the public map once an admin approves it.</span>
                      </div>
                    )}
                    {charger.status === 'declined' && charger.admin_notes && (
                      <div className="bg-red-950/30 border border-red-500/20 p-2 rounded-lg text-[11px] text-red-300">
                        <span className="font-bold">Admin Feedback: </span>
                        <span>{charger.admin_notes}</span>
                      </div>
                    )}

                    {/* Quick Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-gray-900/80 p-2 rounded-lg border border-gray-800/80 text-gray-300">
                      <div><span className="text-gray-500">Power:</span> <strong>{charger.power_kw} kW</strong></div>
                      <div><span className="text-gray-500">Plug:</span> <strong>{charger.connector}</strong></div>
                      <div className="sm:col-span-1 col-span-2 truncate"><span className="text-gray-500">Hours:</span> {charger.schedule}</div>
                    </div>

                    {/* Booking Requests for this charger */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedChargerBookings(selectedChargerBookings === charger.id ? null : charger.id)}
                        className="text-[11px] text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{chargerBookings.length} Driver Booking {chargerBookings.length === 1 ? 'Request' : 'Requests'}</span>
                      </button>

                      {selectedChargerBookings === charger.id && (
                        <div className="mt-2 space-y-2 border-t border-gray-800 pt-2">
                          {chargerBookings.length === 0 ? (
                            <p className="text-[11px] text-gray-500 italic">No booking requests received yet for this charger.</p>
                          ) : (
                            chargerBookings.map(b => (
                              <div key={b.id} className="bg-gray-900 p-2 rounded-lg border border-gray-800 text-[11px]">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-bold text-gray-200">{b.driver_name}</span>
                                    <span className="text-gray-500 text-[10px] ml-1">({b.vehicle_model})</span>
                                    <p className="text-gray-400 text-[10px]">Slot: {b.requested_slot} · {b.duration_hours} hrs</p>
                                    <p className="text-gray-500 text-[10px]">Contact: {b.driver_contact}</p>
                                    {b.driver_notes && <p className="text-gray-400 italic text-[10px]">"{b.driver_notes}"</p>}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : b.status === 'declined' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                      {b.status.toUpperCase()}
                                    </span>
                                    {b.status === 'pending' && (
                                      <div className="flex gap-1 mt-1.5">
                                        <button
                                          type="button"
                                          onClick={() => { updateBookingStatus(b.id, 'accepted'); onRefresh?.(); }}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { updateBookingStatus(b.id, 'declined'); onRefresh?.(); }}
                                          className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Decline
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
