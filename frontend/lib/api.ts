import type {
  ArticleCreate,
  ArticleListItem,
  ArticleRead,
  DebateCreate,
  DebateDetailRead,
  DebateListItem,
  DebateRead,
  HealthCheckRead,
  TopicDebateCreate,
} from "./types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || DEFAULT_API_BASE_URL;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (typeof item === "object" && item !== null && "msg" in item) {
            const msg = (item as { msg?: unknown }).msg;
            return typeof msg === "string" ? msg : JSON.stringify(item);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
    if (detail !== undefined) {
      return JSON.stringify(detail);
    }
  }

  return fallback;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const message = extractErrorMessage(payload, `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function healthCheck(): Promise<HealthCheckRead> {
  return request<HealthCheckRead>("/api/health");
}

export function createArticle(payload: ArticleCreate): Promise<ArticleRead> {
  return request<ArticleRead>("/api/articles", {
    method: "POST",
    body: payload,
  });
}

export function listArticles(): Promise<ArticleListItem[]> {
  return request<ArticleListItem[]>("/api/articles");
}

export function getArticle(articleId: number): Promise<ArticleRead> {
  return request<ArticleRead>(`/api/articles/${articleId}`);
}

export function listArticleDebates(articleId: number): Promise<DebateListItem[]> {
  return request<DebateListItem[]>(`/api/articles/${articleId}/debates`);
}

export function deleteArticle(articleId: number): Promise<void> {
  return request<void>(`/api/articles/${articleId}`, {
    method: "DELETE",
  });
}

export function createDebate(payload: DebateCreate): Promise<DebateRead> {
  return request<DebateRead>("/api/debates", {
    method: "POST",
    body: payload,
  });
}

export function createTopicDebate(payload: TopicDebateCreate): Promise<DebateRead> {
  return request<DebateRead>("/api/topic-debates", {
    method: "POST",
    body: payload,
  });
}

export function listDebates(): Promise<DebateListItem[]> {
  return request<DebateListItem[]>("/api/debates");
}

export function getDebate(debateId: number): Promise<DebateDetailRead> {
  return request<DebateDetailRead>(`/api/debates/${debateId}`);
}

export function rerunDebate(debateId: number): Promise<DebateRead> {
  return request<DebateRead>(`/api/debates/${debateId}/rerun`, {
    method: "POST",
  });
}

export function deleteDebate(debateId: number): Promise<void> {
  return request<void>(`/api/debates/${debateId}`, {
    method: "DELETE",
  });
}
