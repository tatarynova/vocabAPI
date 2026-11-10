// Talking to the API. The key is remembered in this browser only.
import { storage } from "./storage.js";

let apiKey = storage.get("vocabKey") || "";
let onUnauthorized = () => {};

export function setApiKey(key) {
  apiKey = key;
  storage.set("vocabKey", key);
}

// Called when the server says the key is missing or wrong.
export function whenUnauthorized(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError("Missing or wrong API key", 401);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  return data;
}
