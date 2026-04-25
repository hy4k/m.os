import type { AuditEvent, Credential, DiaryEntry, KnowledgeItem, Project, Todo } from "./api";

export const demoData: {
  projects: Project[];
  notes: KnowledgeItem[];
  diary: DiaryEntry[];
  todos: Todo[];
  credentials: Credential[];
  audit: AuditEvent[];
} = {
  projects: [
    {
      id: "demo-project-1",
      name: "noteos.in rebuild",
      description: "Fresh Personal LLM OS with vault, diary, project graph, and assistant.",
      platform: "Hostinger + Azure Ollama",
      status: "active"
    },
    {
      id: "demo-project-2",
      name: "Azure Ollama runtime",
      description: "Quality-first local model host for Gemma/Qwen routing.",
      platform: "Azure",
      status: "active"
    },
    {
      id: "demo-project-3",
      name: "Supabase knowledge vault",
      description: "Relational graph, audit events, vector search, encrypted secrets.",
      platform: "Postgres + pgvector",
      status: "design"
    }
  ],
  notes: [
    {
      id: "demo-note-1",
      kind: "idea",
      title: "Life graph assistant",
      content: "Every idea, repo, account, credential, and goal should connect to projects and timelines."
    },
    {
      id: "demo-note-2",
      kind: "business",
      title: "Business cockpit",
      content: "Track experiments, domains, funnels, customers, expenses, decisions, and founder notes."
    }
  ],
  diary: [
    {
      id: "demo-diary-1",
      title: "Today",
      content: "Build the foundation, make it beautiful, then connect models and platforms.",
      mood: "focused"
    }
  ],
  todos: [
    {
      id: "demo-todo-1",
      title: "Deploy staging subdomain",
      detail: "Run API and web behind HTTPS before replacing current noteos.in.",
      status: "pending",
      priority: "high"
    },
    {
      id: "demo-todo-2",
      title: "Connect Azure Ollama",
      detail: "Point gateway to Azure base URL and test coding/deep reasoning routes.",
      status: "in_progress",
      priority: "high"
    }
  ],
  credentials: [
    {
      id: "demo-cred-1",
      label: "GitHub automation token",
      kind: "api_key",
      secret_preview: "********"
    },
    {
      id: "demo-cred-2",
      label: "Supabase project URL",
      kind: "database",
      secret_preview: "********"
    }
  ],
  audit: [
    {
      id: "demo-audit-1",
      action: "assistant.chat",
      resource_type: "assistant_session",
      created_at: new Date().toISOString()
    },
    {
      id: "demo-audit-2",
      action: "credential.create",
      resource_type: "credential",
      created_at: new Date().toISOString()
    }
  ]
};
