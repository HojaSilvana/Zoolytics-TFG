const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

export function createIncidentApi(payload) {
  return request("/api/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIncidentMessagesApi(incidentId, { includeInternal = false } = {}) {
  const query = includeInternal ? "?includeInternal=true" : "";
  return request(`/api/incidents/${encodeURIComponent(incidentId)}/messages${query}`);
}

export function sendIncidentMessageApi(incidentId, payload) {
  return request(`/api/incidents/${encodeURIComponent(incidentId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
