import type {
  Generation,
  GenerationCreate,
  GenerationList,
  PublicConfig,
  UserProfile,
} from "./types";
import { getOrCreateUserId } from "./user-identity";

const API_ROOT = import.meta.env.VITE_API_URL || "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": getOrCreateUserId(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const body = (await response.json()) as {
        detail?: string | Array<{ msg: string }>;
      };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).join("；");
      }
    } catch {
      // Keep the status-based fallback when the server returns non-JSON errors.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  config: () => request<PublicConfig>("/config"),
  initializeUser: (id: string) =>
    request<UserProfile>("/users/initialize", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  currentUser: () => request<UserProfile>("/users/me"),
  listGenerations: (limit = 40) =>
    request<GenerationList>(`/generations?limit=${limit}`),
  getGeneration: (id: string) =>
    request<Generation>(`/generations/${id}`),
  createGeneration: (input: GenerationCreate) =>
    request<Generation>("/generations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteGeneration: (id: string) =>
    request<void>(`/generations/${id}`, { method: "DELETE" }),
};
