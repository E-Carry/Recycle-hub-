// Notifications are derived from existing records (pickups, orders, audit log);
// nothing new is stored except each user's notifSeenAt.

// Industrial orders are keyed by partner code; older accounts without one fall back to email.
const partnerKey = (u) => String(u.uid || u.partnerCode || u.email).toUpperCase();
const ms = (t) => Date.parse(t) || 0;

const pickupNote = (p) => ({
  id: 'pickup:' + p.id, ts: p.createdAt, kind: 'pickup',
  title: `Pickup ${p.id}`,
  body: `${p.weightKg} kg ${p.materialName || 'material'} · ${p.status || 'Scheduled'}`,
});
const orderNote = (o) => ({
  id: 'order:' + o.id, ts: o.orderedAt, kind: 'order',
  title: `Order ${o.id}`,
  body: `${o.quantityTons} t ${o.materialName || 'material'} · ${o.deliveryStatus || 'Confirmed'}`,
});
const auditNote = (l) => ({
  id: 'audit:' + l.id, ts: l.timestamp, kind: 'audit',
  title: String(l.action || 'Update').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
  body: l.details || '',
});

function feed(user, role, data) {
  const email = String(user.email || '').toLowerCase();
  const pickups = data.sourcingPickups || [];
  const orders = data.industrialOrders || [];
  let items;
  if (role === 'admin') {
    items = [...pickups.map(pickupNote), ...orders.map(orderNote), ...(data.auditLogs || []).map(auditNote)];
  } else if (role === 'industrial') {
    const me = partnerKey(user);
    items = orders.filter((o) => String(o.partnerUid).toUpperCase() === me).map(orderNote);
  } else {
    items = pickups.filter((p) => String(p.partnerEmail).toLowerCase() === email).map(pickupNote);
  }
  if (user.registeredAt) {
    items.push({ id: 'welcome', ts: user.registeredAt, kind: 'welcome', title: 'Welcome to Recycle Hub', body: 'Your account is set up. Take the tour from the account menu any time.' });
  }
  return items.sort((a, b) => ms(b.ts) - ms(a.ts)).slice(0, 30);
}

const unread = (items, seenAt) => items.filter((n) => ms(n.ts) > ms(seenAt)).length;

module.exports = { feed, unread, partnerKey };
