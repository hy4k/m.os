export const OWNER_ID = "00000000-0000-0000-0000-000000000001";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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

export type AuditEvent = {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": OWNER_ID,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function loadCommandCenter() {
  const [projects, notes, diary, todos, credentials, audit] = await Promise.all([
    request<Project[]>("/api/projects"),
    request<KnowledgeItem[]>("/api/notes"),
    request<DiaryEntry[]>("/api/diary"),
    request<Todo[]>("/api/todos"),
    request<Credential[]>("/api/credentials"),
    request<AuditEvent[]>("/api/audit-events")
  ]);

  return { projects, notes, diary, todos, credentials, audit };
}

export async function createProject(input: Pick<Project, "name" | "description" | "platform">) {
  return request<{ id: string }>("/api/projects", {
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

export async function askAssistant(input: { prompt: string; policy: string }) {
  return request<{ output: string; provider: string; model: string }>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
