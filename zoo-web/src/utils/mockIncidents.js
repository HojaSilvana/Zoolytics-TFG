const INCIDENTS_KEY = "zoo.mockIncidents.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(INCIDENTS_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(items) {
  try {
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function createIncident(payload) {
  const now = new Date().toISOString();
  const id =
    (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
    `INC-${Math.random().toString(16).slice(2)}-${Date.now()}`;

  const incident = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "Nueva",
    messages: [],
    ...payload,
  };

  const all = readAll();
  all.unshift(incident);
  writeAll(all);
  return incident;
}

export function listIncidentsByOwner(ownerKey) {
  const all = readAll();
  return all.filter((i) => i.ownerKey === ownerKey);
}

export function updateIncident(id, patch) {
  const all = readAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function getIncident(id) {
  return readAll().find((i) => i.id === id) || null;
}

