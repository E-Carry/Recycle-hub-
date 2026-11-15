// Partner cancels a booked pickup. Contract (terms-sourcing §11): free up to 2 hours
// before fleet dispatch. Booking already sets status 'Vehicle Dispatched', so the
// cut-off is measured from the slot's start time, in server local time.

const WINDOW_MS = 2 * 3600e3;
const LOCKED = /route|transit|loading|weigh|deliver|complet|paid|settled|collected|picked|cancel|fail|reject/i;
const CANCELLED = 'Cancelled by Partner';

function slotStart(date, slot) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const t = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot || '');
  if (!d || !t) return null;
  const h = (+t[1] % 12) + (t[3].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(+d[1], +d[2] - 1, +d[3], h, +t[2]);
}

// Why pickup p can't be cancelled at `now`, or null if it can.
function blocker(p, now = new Date()) {
  if (LOCKED.test(p.status || '')) return `This pickup is already "${p.status}" and can't be cancelled here. Contact support.`;
  const start = slotStart(p.pickupDate, p.timeSlot);
  if (!start) return 'This pickup has no readable slot time. Contact support to cancel.';
  if (start - now < WINDOW_MS) return 'Pickups can only be cancelled up to 2 hours before the slot starts. Contact support.';
  return null;
}

// Returns { pickup } on success, { code, error } otherwise. Mutates data on success only.
function cancelPickup(data, id, email, now = new Date()) {
  const me = String(email || '').toLowerCase();
  const p = (data.sourcingPickups || []).find((x) => x.id === id && String(x.partnerEmail).toLowerCase() === me);
  if (!p) return { code: 404, error: 'Pickup not found.' };
  const why = blocker(p, now);
  if (why) return { code: 409, error: why };

  p.status = CANCELLED;
  p.cancelledAt = now.toISOString();
  for (const s of data.pickupSlots || []) if (p.billNumber && s.billNumber === p.billNumber) s.status = CANCELLED;
  if (!data.auditLogs) data.auditLogs = [];
  data.auditLogs.unshift({
    id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
    timestamp: p.cancelledAt,
    adminEmail: 'system.event@recyclehub.in',
    action: 'SOURCING_PICKUP_CANCELLED',
    productId: p.materialId,
    productName: p.materialName,
    oldPrice: 'N/A',
    newPrice: 'N/A',
    details: `Sourcing Partner ${p.partnerEmail} cancelled pickup ${p.id} (bill ${p.billNumber}).`,
  });
  return { pickup: p };
}

module.exports = { slotStart, blocker, cancelPickup, CANCELLED };
