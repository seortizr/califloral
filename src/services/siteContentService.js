const fs = require("fs");
const path = require("path");

const CONTENT_FILE = path.join(__dirname, "../content/site-pages.json");

const FALLBACK = {
  nosotros: {
    heroTitle: "CaliFloral",
    heroSubtitle: "Flores frescas en Cali.",
    intro: "",
    blocks: [],
    highlights: [],
    ctaText: "",
    ctaButton: "Contacto",
    ctaHref: "/contacto",
  },
  contacto: {
    heroTitle: "Contacto",
    heroSubtitle: "",
    phoneDisplay: "",
    phoneTel: "",
    whatsapp: "",
    email: "",
    address: "",
    hours: "",
    mapEmbedUrl: "",
    lat: "",
    lng: "",
    note: "",
  },
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const v = patch[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[key] = deepMerge(base[key] || {}, v);
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out;
}

function loadSitePages() {
  try {
    const raw = fs.readFileSync(CONTENT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      nosotros: deepMerge(FALLBACK.nosotros, parsed.nosotros || {}),
      contacto: deepMerge(FALLBACK.contacto, parsed.contacto || {}),
    };
  } catch {
    return { ...FALLBACK };
  }
}

function mapEmbedSrc(contact) {
  if (contact.mapEmbedUrl && String(contact.mapEmbedUrl).trim()) {
    return String(contact.mapEmbedUrl).trim();
  }
  if (contact.lat && contact.lng) {
    const q = encodeURIComponent(`${contact.lat},${contact.lng}`);
    return `https://maps.google.com/maps?q=${q}&z=16&output=embed`;
  }
  return "";
}

module.exports = { loadSitePages, mapEmbedSrc };
