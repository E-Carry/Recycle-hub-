// Admin-side records are copies of partner-side ones. When the admin desk moves a
// delivery or pickup slot along, copy the change back so partner dashboards follow.

// industrialOrders[].deliveryStatus <- deliveries[].status (linked by delivery.orderId)
function syncOrderStatus(orders, del) {
  if (!del || !del.orderId || !del.status) return null;
  const o = (orders || []).find((x) => x.id === del.orderId);
  if (!o) return null;
  o.deliveryStatus = del.status;
  return o;
}

// sourcingPickups[] <- pickupSlots[] (linked by billNumber; seed slots have none)
function syncPickupStatus(pickups, slot) {
  if (!slot || !slot.billNumber || !slot.status) return null;
  const p = (pickups || []).find((x) => x.billNumber === slot.billNumber);
  if (!p) return null;
  p.status = slot.status;
  if (slot.assignedTransport) p.assignedTransport = slot.assignedTransport;
  return p;
}

module.exports = { syncOrderStatus, syncPickupStatus };
