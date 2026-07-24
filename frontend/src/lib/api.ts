import type { ApiErrorBody, HealthResponse } from "./types";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("invalid_json", "The server returned a response that is not JSON.", response.status);
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("error" in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const record = error as { code?: unknown; message?: unknown };
  return typeof record.code === "string" && typeof record.message === "string";
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await parseJson(response);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status);
    }
    throw new ApiError(
      "request_failed",
      `Request failed with status ${response.status}. Check that the API is running.`,
      response.status,
    );
  }

  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/api/health");
}
