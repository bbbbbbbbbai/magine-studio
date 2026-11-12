import { createUuid } from "./uuid";

const USER_ID_KEY = "imagine-studio:user-uuid:v1";
const ACK_KEY = "imagine-studio:user-uuid-ack:v1";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUserId(value: string) {
  return UUID_PATTERN.test(value);
}

export function getOrCreateUserId() {
  try {
    const stored = window.localStorage.getItem(USER_ID_KEY)?.trim();
    if (stored && isValidUserId(stored)) return stored.toLowerCase();
  } catch {
    // Fall through and create a session UUID when storage is unavailable.
  }
  const created = createUuid();
  try {
    window.localStorage.setItem(USER_ID_KEY, created);
  } catch {
    // The returned UUID still works for the current page session.
  }
  return created;
}

export function replaceUserId(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!isValidUserId(normalized)) {
    throw new Error("请输入有效的 UUID");
  }
  window.localStorage.setItem(USER_ID_KEY, normalized);
  return normalized;
}

export function isUserIdAcknowledged() {
  try {
    return window.localStorage.getItem(ACK_KEY) === getOrCreateUserId();
  } catch {
    return false;
  }
}

export function acknowledgeUserId() {
  try {
    window.localStorage.setItem(ACK_KEY, getOrCreateUserId());
  } catch {
    // Closing the dialog still lets the current session continue.
  }
}
