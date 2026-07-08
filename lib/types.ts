import type { FormEvent, ReactNode } from "react";

export type User = {
  id: string;
  email: string;
  name?: string;
  orgId: string;
  roles: string[];
  isActive?: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type Health = {
  status: string;
  database: string;
  redis?: { status: string };
  queue?: { status: string; prefix: string };
  storage?: { status: string; provider: string; bucketConfigured: boolean };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  deploymentMode: string;
};

export type ProductEntitlement = {
  id: string;
  organizationId: string;
  status: string;
  config: Record<string, unknown>;
  product: {
    id: string;
    key: string;
    name: string;
    description: string;
    status: string;
  };
};

export type AIProvider = {
  id: string;
  organizationId: string;
  provider: string;
  status: string;
  name: string;
  baseUrl?: string | null;
  hasApiKey: boolean;
  chatModel?: string | null;
  embeddingModel?: string | null;
  settings: Record<string, unknown>;
};

export type Message = {
  id: string;
  role: "visitor" | "assistant" | "agent" | "system";
  content: string;
  createdAt: string;
  citations: Array<{ chunkId: string; score: number; content: string }>;
};

export type Conversation = {
  id: string;
  organizationId: string;
  status: "open" | "waiting_for_agent" | "closed";
  assignedAgentId?: string | null;
  visitorId?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationList = {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
};

export type WidgetConfig = {
  organizationId: string;
  widgetKey: string;
  enabled: boolean;
  greetingText: string;
  allowedDomains: string[];
  settings: Record<string, unknown>;
};

export type KnowledgeSource = {
  id: string;
  name: string;
  type: string;
  status: string;
  rawText?: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorEmail?: string | null;
  createdAt: string;
};

export type ApiState = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

export type FormHandler = (event: FormEvent<HTMLFormElement>) => void;

export type ChildrenProps = {
  children: ReactNode;
};

export type TabId =
  | "dashboard"
  | "inbox"
  | "knowledge"
  | "widget"
  | "users"
  | "products"
  | "ai"
  | "audit";
