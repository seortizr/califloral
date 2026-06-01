const DEFAULT_REGION = "Cali, Valle del Cauca, Colombia";

function isPickupAddress(address) {
  return /recogida en sitio/i.test(String(address || ""));
}

function buildDeliveryQuery(address, zoneLabel) {
  const base = String(address || "").trim();
  if (!base || isPickupAddress(base)) return "";

  if (/cali|colombia|valle del cauca/i.test(base)) {
    return base;
  }

  const zone = zoneLabel ? String(zoneLabel).trim() : "";
  if (zone && !base.toLowerCase().includes(zone.toLowerCase())) {
    return `${base}, ${zone}, ${DEFAULT_REGION}`;
  }
  return `${base}, ${DEFAULT_REGION}`;
}

function buildGoogleMapsSearchUrl(query) {
  const q = String(query || "").trim();
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildGoogleMapsDirectionsUrl(destination) {
  const q = String(destination || "").trim();
  if (!q) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

function buildGoogleMapsEmbedUrl(query) {
  const q = String(query || "").trim();
  if (!q) return "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

function buildStoreMapInfo(storeContact = {}) {
  const lat = String(storeContact.lat || "").trim();
  const lng = String(storeContact.lng || "").trim();
  const address = String(storeContact.address || "").trim();

  let query = "";
  if (lat && lng) {
    query = `${lat},${lng}`;
  } else if (address) {
    query = `${address}, ${DEFAULT_REGION}`;
  }

  return {
    query,
    mapsUrl: buildGoogleMapsSearchUrl(query),
    directionsUrl: buildGoogleMapsDirectionsUrl(query),
    embedUrl: buildGoogleMapsEmbedUrl(query),
  };
}

function buildOrderMapInfo(order, options = {}) {
  const storeContact = options.storeContact || {};
  const zoneLabel = options.zoneLabel || "";
  const isPickup = order.fulfillmentType === "pickup" || isPickupAddress(order.shippingAddress);

  if (isPickup) {
    const store = buildStoreMapInfo(storeContact);
    return {
      isPickup: true,
      canShowMap: Boolean(store.embedUrl),
      displayAddress: order.shippingAddress,
      mapsUrl: store.mapsUrl,
      directionsUrl: store.directionsUrl,
      embedUrl: store.embedUrl,
      mapsLabel: "Ver tienda en Google Maps",
      directionsLabel: "Como llegar a la tienda",
    };
  }

  const query = buildDeliveryQuery(order.shippingAddress, zoneLabel);
  return {
    isPickup: false,
    canShowMap: Boolean(query),
    displayAddress: order.shippingAddress,
    mapsUrl: buildGoogleMapsSearchUrl(query),
    directionsUrl: buildGoogleMapsDirectionsUrl(query),
    embedUrl: buildGoogleMapsEmbedUrl(query),
    mapsLabel: "Abrir en Google Maps",
    directionsLabel: "Ruta en Google Maps",
  };
}

module.exports = {
  buildOrderMapInfo,
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildDeliveryQuery,
};
