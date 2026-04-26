export const OWNER_ID = "00000000-0000-0000-0000-000000000001";

const SESSION_KEY = "mos_session";

/**
 * Browser uses NEXT_PUBLIC_* (public origin). Server-side (RSC) must reach the API on the Docker
 * network — set API_INTERNAL_BASE_URL=http://api:4000 on the web container; avoid hairpin via https://your-domain.
 */
function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  }
  return (
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:4000"
  );
}

export type Project = {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  status: string;
  updated_at?: string;
};

export type KnowledgeItem = {
  id: string;
  kind: "note" | "idea" | "goal" | "contact" | "business" | "life";
  title: string;
  content: string;
  updated_at?: string;
};

export type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  mood?: string;
  entry_date?: string;
};

export type Todo = {
  id: string;
  title: string;
  detail?: string;
  status: "pending" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
};

export type Credential = {
  id: string;
  label: string;
  kind: string;
  secret_preview: string;
};

export type ProjectLink = {
  id: string;
  project_id: string;
  project_name?: string;
  link_type: "repo" | "deployment" | "database" | "domain" | "storage" | "ai_studio" | "docs" | "other";
  link_label?: string;
  link_value: string;
  created_at?: string;
};

export type Playground = {
  id: string;
  project_id?: string;
  project_name?: string;
  idea_id?: string;
  idea_title?: string;
  title: string;
  brief?: string;
  stage: "seed" | "research" | "prototype" | "build" | "paused" | "launched";
  current_focus?: string;
  next_actions?: string[];
  updated_at?: string;
};

export type PlatformConnection = {
  id: string;
  account_id?: string;
  account_name?: string;
  project_id?: string;
  project_name?: string;
  provider: "github" | "supabase" | "azure" | "hostinger" | "google_ai_studio" | "cursor" | "openclaw" | "other";
  label: string;
  base_url?: string;
  status: "manual" | "connected" | "error" | "disabled";
  last_checked_at?: string;
};

export type ProjectEnvironment = {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  url?: string;
  runtime?: string;
  region?: string;
  status: "unknown" | "healthy" | "degraded" | "down" | "paused";
  updated_at?: string;
};

export type DeploymentNote = {
  id: string;
  project_id?: string;
  project_name?: string;
  environment_id?: string;
  environment_name?: string;
  title: string;
  summary?: string;
  status: "planned" | "running" | "succeeded" | "failed" | "rolled_back";
  version_ref?: string;
  created_at?: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  created_at: string;
};

export type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
    totp_enabled?: boolean;
  };
};

export type AuthMe = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  totp_enabled: boolean;
  totp_enrollment_pending: boolean;
};

export type UserFileRecord = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  project_id: string | null;
  created_at: string;
};

export class TotpRequiredError extends Error {
  readonly code = "TOTP_REQUIRED";
  constructor() {
    super("Authenticator code required");
    this.name = "TotpRequiredError";
  }
}

export type LlmStatus = {
  azure: {
    ok: boolean;
    baseUrl: string;
    version?: string;
    latencyMs: number;
    models: string[];
    expectedModel?: string;
    expectedModelInstalled?: boolean;
    error?: string;
  };
  hostinger: {
    ok: boolean;
    baseUrl: string;
    version?: string;
    latencyMs: number;
    models: string[];
    expectedModel?: string;
    expectedModelInstalled?: boolean;
    error?: string;
  };
  routes: Array<{
    policy: string;
    provider: string;
    model: string;
    baseUrl: string;
  }>;
  cloudFallbackConfigured: boolean;
  mosAssistant?: {
    baseUrl: string;
    model: string;
    numCtx: number;
    temperature: number;
    systemPrompt: "default" | "custom";
  };
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

function authHeaders() {
  const session = getStoredSession();
  if (session?.token) {
    return { Authorization: `Bearer ${session.token}` };
  }
  return { "x-user-id": OWNER_ID };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function loadCommandCenter() {
  const [
    projects,
    notes,
    diary,
    todos,
    credentials,
    audit,
    projectLinks,
    playgrounds,
    platformConnections,
    environments,
    deploymentNotes,
    files
  ] = await Promise.all([
    request<Project[]>("/api/projects"),
    request<KnowledgeItem[]>("/api/notes"),
    request<DiaryEntry[]>("/api/diary"),
    request<Todo[]>("/api/todos"),
    request<Credential[]>("/api/credentials"),
    request<AuditEvent[]>("/api/audit-events"),
    request<ProjectLink[]>("/api/project-links"),
    request<Playground[]>("/api/playgrounds"),
    request<PlatformConnection[]>("/api/platform-connections"),
    request<ProjectEnvironment[]>("/api/environments"),
    request<DeploymentNote[]>("/api/deployment-notes"),
    request<UserFileRecord[]>("/api/files")
  ]);

  return {
    projects,
    notes,
    diary,
    todos,
    credentials,
    audit,
    projectLinks,
    playgrounds,
    platformConnections,
    environments,
    deploymentNotes,
    files
  };
}

export async function register(input: { email: string; password: string; display_name?: string }) {
  const session = await request<AuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
  storeSession(session);
  return session;
}

export async function login(input: { email: string; password: string; totp_code?: string }) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const response = await fetch(`${apiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      ...(input.totp_code ? { totp_code: input.totp_code } : {})
    }),
    cache: "no-store"
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      data &&
      typeof data === "object" &&
      (data as { code?: string }).code === "TOTP_REQUIRED"
    ) {
      throw new TotpRequiredError();
    }
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const session = data as AuthSession;
  storeSession(session);
  return session;
}

export async function getAuthMe() {
  return request<AuthMe>("/api/auth/me");
}

export async function totpEnrollStart() {
  return request<{ otpauth_url: string; secret: string }>("/api/auth/totp/enroll-start", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function totpEnrollVerify(code: string) {
  return request<{ ok: boolean }>("/api/auth/totp/enroll-verify", {
    method: "POST",
    body: JSON.stringify({ code })
  });
}

export async function totpDisable(password: string) {
  return request<{ ok: boolean }>("/api/auth/totp/disable", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export async function loadLlmStatus() {
  return request<LlmStatus>("/api/llm/status");
}

export async function createProject(input: Pick<Project, "name" | "description" | "platform">) {
  return request<{ id: string }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createProjectLink(input: Pick<ProjectLink, "project_id" | "link_type" | "link_label" | "link_value">) {
  return request<{ id: string }>("/api/project-links", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createPlayground(input: Pick<Playground, "project_id" | "title" | "brief" | "stage" | "current_focus"> & { next_actions?: string[] }) {
  return request<{ id: string }>("/api/playgrounds", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updatePlayground(
  id: string,
  patch: Partial<Pick<Playground, "title" | "brief" | "stage" | "current_focus" | "next_actions">> & {
    project_id?: string | null;
    idea_id?: string | null;
  }
) {
  return request<Playground>(`/api/playgrounds/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export async function listUserFiles() {
  return request<UserFileRecord[]>("/api/files");
}

export async function uploadUserFile(file: File, projectId?: string) {
  const session = getStoredSession();
  const fd = new FormData();
  fd.append("file", file);
  if (projectId) {
    fd.append("project_id", projectId);
  }
  const headers = new Headers();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  } else {
    headers.set("x-user-id", OWNER_ID);
  }
  const response = await fetch(`${apiBaseUrl()}/api/files/upload`, {
    method: "POST",
    headers,
    body: fd,
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<{ id: string }>;
}

export async function downloadUserFileBlob(id: string) {
  const session = getStoredSession();
  const headers = new Headers();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  } else {
    headers.set("x-user-id", OWNER_ID);
  }
  const response = await fetch(`${apiBaseUrl()}/api/files/${id}/download`, {
    headers,
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.blob();
}

export async function createPlatformConnection(input: {
  account_id?: string;
  project_id?: string;
  provider: PlatformConnection["provider"];
  label: string;
  base_url?: string;
  status?: PlatformConnection["status"];
  metadata?: Record<string, unknown>;
}) {
  return request<{ id: string }>("/api/platform-connections", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createProjectEnvironment(input: {
  project_id: string;
  name: string;
  url?: string;
  runtime?: string;
  region?: string;
  status?: ProjectEnvironment["status"];
}) {
  return request<{ id: string }>("/api/environments", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createDeploymentNote(input: {
  project_id?: string;
  environment_id?: string;
  title: string;
  summary?: string;
  status?: DeploymentNote["status"];
  version_ref?: string;
}) {
  return request<{ id: string }>("/api/deployment-notes", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function importGithubRepos(input: {
  project_id: string;
  credential_id?: string;
  token?: string;
  store_token?: boolean;
}) {
  return request<{ imported: number; skipped: number; link_ids: string[] }>("/api/connectors/github/import-repos", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createNote(input: Pick<KnowledgeItem, "title" | "content" | "kind">) {
  return request<{ id: string }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createTodo(input: Pick<Todo, "title" | "detail" | "priority">) {
  return request<{ id: string }>("/api/todos", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createDiary(input: Pick<DiaryEntry, "title" | "content" | "mood">) {
  return request<{ id: string }>("/api/diary", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createCredential(input: { label: string; kind: string; secret: string }) {
  return request<{ id: string }>("/api/credentials", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type AssistantChatResult = {
  output: string;
  provider: string;
  model: string;
  rag_sources?: Array<{ id: string; kind: string; title: string; similarity: number }>;
};

export async function askAssistant(input: {
  prompt: string;
  policy: string;
  include_rag?: boolean;
  rag_limit?: number;
}) {
  return request<AssistantChatResult>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
