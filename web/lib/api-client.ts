const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type ClickStatus = "VALID" | "DUPLICATE" | "BOT";

export interface DashboardMetrics {
  totalValidClicks: number;
  duplicateAttempts: number;
  botClicks: number;
  totalParticipants: number;
  duplicateBlockedRate: number; // 0..1
}

export interface LeaderboardRow {
  rank: number;
  participantId: string;
  name: string;
  maskedPhoneNumber: string | null;
  score: number;
}

export interface DashboardResponse {
  event: { id: string; name: string; status: "ACTIVE" | "EXPIRED"; expiresAt: string };
  metrics: DashboardMetrics;
  leaderboard: LeaderboardRow[];
}

export interface ClickLogRow {
  id: string;
  participantName: string;
  refCode: string;
  ipHash: string;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  status: ClickStatus;
  clickedAt: string;
}

export interface ClickLogsResponse {
  logs: ClickLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClickLogsQuery {
  page?: number;
  pageSize?: number;
  status?: ClickStatus;
  participantName?: string;
}

export interface ParticipantStatusResponse {
  participant: { id: string; name: string; refCode: string; score: number };
  rank: number | null;
  event: { id: string; name: string; status: "ACTIVE" | "EXPIRED"; expiresAt: string };
  shareableLink: string;
  promotionalMessage: string;
}

export interface AuthResponse {
  token: string;
  host: {
    id: string;
    email: string;
  };
}

export interface EventSummary {
  id: string;
  name: string;
  status: "ACTIVE" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

export interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  ogImageUrl: string | null;
  status: "ACTIVE" | "EXPIRED";
  expiresAt: string;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  targetGroupUrl: string;
  ogImageUrl?: string;
  duration: { value: number; unit: "hours" | "days" };
}

export interface RegisterParticipantResponse {
  participant: { id: string; name: string; refCode: string; score: number; createdAt: string };
  shareableLink: string;
  promotionalMessage: string;
  dashboardAccessToken: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("referral_token");
}

async function apiFetch<T>(path: string, tokenOverride?: string | null): Promise<T> {
  const token = tokenOverride ?? getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    let responseBody: unknown = null;

    if (responseText.trim()) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned invalid JSON (HTTP ${res.status})`
        );
      }
    }

    if (!res.ok) {
      const message =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody &&
        typeof responseBody.message === "string"
          ? responseBody.message
          : `Request failed with status ${res.status}`;

      throw new Error(message);
    }

    if (responseBody === null) {
      throw new Error(
        `Server returned an empty response (HTTP ${res.status})`
      );
    }

    return responseBody as T;
  } catch (err) {
    console.error("API request failed:", err);
    throw err;
  }
}
export const api = {
  getDashboard: (eventId: string) =>
    apiFetch<DashboardResponse>(`/api/v1/host/events/${eventId}/dashboard`),

  getClickLogs: (eventId: string, query: ClickLogsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.status) params.set("status", query.status);
    if (query.participantName) params.set("participantName", query.participantName);
    const qs = params.toString();
    return apiFetch<ClickLogsResponse>(`/api/v1/host/events/${eventId}/logs${qs ? `?${qs}` : ""}`);
  },

  // Participant status is gated by the participant's own token, passed
  // explicitly rather than read from the host's `referral_token` in
  // localStorage — these are two entirely separate auth subjects.
  getMyStatus: (participantToken: string) =>
    apiFetch<ParticipantStatusResponse>(`/api/v1/participants/me`, participantToken),

  registerHost: (email: string, password: string) =>
    apiPost<AuthResponse>(`/api/v1/auth/register`, { email, password }),

  loginHost: (email: string, password: string) =>
    apiPost<AuthResponse>(`/api/v1/auth/login`, { email, password }),

  // Host's own events — used by the /host landing page.
  listEvents: () => apiFetch<{ events: EventSummary[] }>(`/api/v1/events`),

  createEvent: (input: CreateEventInput) =>
    apiPost<{ event: EventSummary & { targetGroupUrl: string } }>(`/api/v1/events`, input).then(
      (res) => res.event
    ),

  // Public — no host token required (the endpoint itself has no auth
  // check). Backs /join/:eventId, which a host shares so people can
  // register as referrers for their event.
  getPublicEvent: (eventId: string) => apiFetch<PublicEvent>(`/api/v1/events/${eventId}/public`),

  registerParticipant: (eventId: string, name: string, phoneNumber: string) =>
    apiPost<RegisterParticipantResponse>(`/api/v1/participants/register`, {
      eventId,
      name,
      phoneNumber,
    }),
};
