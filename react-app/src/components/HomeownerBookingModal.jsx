import { useState } from 'react';
import { 
  X, 
  Home, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Phone, 
  Car, 
  Calendar,
  Lock
} from 'lucide-react';
import { addBookingRequest } from '../services/storageAdapter';

export default function HomeownerBookingModal({ 
  isOpen, 
  onClose, 
  charger, 
  onBookingSuccess 
}) {
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [requestedSlot, setRequestedSlot] = useState('Today, 2:00 PM – 4:00 PM');
  const [durationHours, setDurationHours] = useState('2');
  const [driverNotes, setDriverNotes] = useState('');

  const [formError, setFormError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  if (!isOpen || !charger) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const res = addBookingRequest({
      charger_id: charger.id,
      driver_name: driverName,
      driver_contact: driverContact,
      vehicle_model: vehicleModel || 'Electric Vehicle',
      requested_slot: requestedSlot,
      duration_hours: durationHours,
      driver_notes: driverNotes,
    });

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    setConfirmedBooking(res.booking);
    onBookingSuccess?.(res.booking);
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    setDriverName('');
    setDriverContact('');
    setVehicleModel('');
    setDriverNotes('');
    setFormError(null);
    onClose();
  };

  const displayAddress = charger.is_address_public
    ? (charger.exact_address || charger.address)
    : (charger.approx_address || `${charger.region} (Approximate neighborhood)`);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 relative shadow-2xl max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button 
          type="button"
          onClick={handleClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {!confirmedBooking ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-100">
                  Request Private Charger Booking
                </h3>
                <p className="text-xs text-gray-400">Rent private charging time from host {charger.owner_name}</p>
              </div>
            </div>

            {/* Charger Summary Card */}
            <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 my-3 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-bold text-gray-100 text-sm">{charger.title}</h4>
                  <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                    <span>📍</span> {displayAddress}
                  </p>
                </div>
                <span className="font-black text-purple-400 text-xs bg-purple-950/80 px-2 py-1 rounded border border-purple-700/60 shrink-0">
                  {charger.price}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300 border-t border-purple-900/40 pt-2">
                <span>⚡ <strong>{charger.power_kw} kW</strong></span>
                <span>🔌 <strong>{charger.connector}</strong></span>
                <span className="truncate">🕒 {charger.schedule}</span>
              </div>

              {!charger.is_address_public && (
                <div className="mt-2 bg-gray-950/70 p-2 rounded-lg border border-purple-800/30 flex items-start gap-1.5 text-[11px] text-purple-300">
                  <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Host Privacy: Exact house address and gated entry details will be shared once the host accepts your booking.
                  </span>
                </div>
              )}
            </div>

            {/* Honest Prototype Notice */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 mb-4 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Honest Prototype Notice: </span>
                This app is currently a frontend-only local prototype. Payment processing, identity verification, insurance, and booking guarantees are simulated locally on this device.
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Rahul Sen"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Your Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    placeholder="+91 98111 22334"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Vehicle Model
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="e.g. Tata Nexon EV, MG ZS"
                      className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Charging Duration
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="1">1 Hour (Quick Top-up)</option>
                    <option value="2">2 Hours (~30–50% charge)</option>
                    <option value="3">3 Hours (~60–80% charge)</option>
                    <option value="4">4+ Hours (Full Charge)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Requested Date & Time Slot *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={requestedSlot}
                    onChange={(e) => setRequestedSlot(e.target.value)}
                    placeholder="e.g. Today 2:00 PM – 4:00 PM, or Tomorrow 10:00 AM"
                    className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Note to Host (Optional)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="e.g. Will reach on time, need CCS-2 / Type 2 adapter if required"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-xl transition flex justify-center items-center gap-2 cursor-pointer shadow-lg text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Send Booking Request to Host
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-gray-100">Booking Request Sent!</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Your request has been forwarded to host <strong>{charger.owner_name}</strong>.
              </p>
            </div>

            <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Charger:</span>
                <span className="font-bold text-gray-200">{charger.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Host:</span>
                <span className="font-bold text-purple-400">{charger.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Host Phone:</span>
                <span className="font-mono text-gray-300">{charger.owner_contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested Slot:</span>
                <span className="font-bold text-emerald-400">{confirmedBooking.requested_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Rate:</span>
                <span className="font-bold text-gray-200">{charger.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                  Pending Host Confirmation
                </span>
              </div>
            </div>

            {/* Prototype notice */}
            <div className="bg-gray-950 border border-gray-800 p-2.5 rounded-xl text-[11px] text-gray-400 text-left">
              <span className="font-bold text-gray-300">Phase 1 Prototype: </span>
              In this local demonstration, the booking is recorded on your browser. You can reach out directly to the host via their contact number for coordination.
            </div>

            <div className="flex gap-2">
              {charger.owner_contact && (
                <a
                  href={`tel:${charger.owner_contact}`}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2.5 rounded-xl transition text-xs flex justify-center items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Host
                </a>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
