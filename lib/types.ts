import type { FormEvent, ReactNode } from "react";

export type User = {
  id: string;
  email: string;
  name?: string;
  orgId: string;
  roles: string[];
  clearanceLevel: number;
  productAccess: ProductAccessGrant[];
  customRoles: CustomRole[];
  isActive?: boolean;
};

export type ProductKey =
  | "customer_chat"
  | "appointment_booking"
  | "whatsapp_assistant"
  | "voice_receptionist";

export type ProductAccessGrant = {
  productKey: ProductKey;
  canUse: boolean;
  canConfigure: boolean;
  canManageAgents: boolean;
  canManageKnowledge: boolean;
};

export type CustomRole = {
  id: string;
  organizationId?: string;
  name: string;
  description?: string | null;
  clearanceLevel: number;
  isTemplate: boolean;
  isActive: boolean;
  productAccess: ProductAccessGrant[];
  _count?: { assignments: number };
};

export type ServicePrincipal = {
  id: string;
  organizationId: string;
  productKey: ProductKey;
  name: string;
  clientId: string;
  clientSecret?: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: User;
};

export type InviteResponse = {
  invited: boolean;
  email: string;
  userId: string;
  expiresAt: string;
  devInviteToken?: string;
};

export type PasswordResetRequestResponse = {
  requested: boolean;
  expiresAt?: string;
  devResetToken?: string;
};

export type Health = {
  status: string;
  database: string;
  redis?: { status: string };
  queue?: { status: string; prefix: string };
  storage?: { status: string; provider: string; bucketConfigured: boolean };
};

export type ObservabilitySummary = {
  generatedAt: string;
  process: {
    uptimeSeconds: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
  audit: { events24h: number };
  auth?: {
    activeSessions: number;
    pendingInvites: number;
    passwordResetTokens24h: number;
  };
  ai?: {
    assistantMessagesSampled24h: number;
    fallbacks24h: number;
    providerErrors24h: number;
  };
  customerChat: { open: number; waitingForAgent: number };
  whatsappAssistant: { open: number; waitingForAgent: number };
  voiceReceptionist: { inProgress: number; waitingForAgent: number };
  appointmentBooking: { upcoming: number; cancelled24h: number };
  knowledge: { readySources: number; failedSources: number };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: string;
  plan: string;
  deploymentMode: string;
  users?: Array<Pick<User, "id" | "name" | "email" | "isActive">>;
  _count?: { users: number; products: number };
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
  metadata: Record<string, unknown>;
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

export type PublicWidgetConversationCreated = {
  conversation: Conversation;
  visitorToken: string;
};

export type CustomerChatSendMessageResponse = {
  conversation: Conversation;
  visitorMessage: Message;
  assistantMessage: Message;
};

export type KnowledgeSource = {
  id: string;
  name: string;
  type: string;
  status: string;
  sensitivityLevel: number;
  productVisibility: ProductKey[];
  categories: string[];
  levelSource?: "auto" | "manual";
  folderId?: string | null;
  isQuarantined: boolean;
  rawText?: string | null;
  createdAt: string;
};

export type KnowledgeCategory = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

export type KnowledgeFolder = {
  id: string;
  organizationId: string;
  name: string;
  parentId?: string | null;
  _count?: { sources: number; children: number };
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorEmail?: string | null;
  createdAt: string;
};

export type AppointmentService = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents?: number | null;
  currency: string;
  status: "active" | "inactive";
  metadata: Record<string, unknown>;
};

export type AppointmentStaff = {
  id: string;
  organizationId: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  timezone: string;
  status: "active" | "inactive";
  services: AppointmentService[];
  metadata: Record<string, unknown>;
};

export type AppointmentSlot = {
  staffId: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
};

export type AppointmentBooking = {
  id: string;
  organizationId: string;
  serviceId: string;
  staffId: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  notes?: string | null;
  cancellationReason?: string | null;
  metadata: Record<string, unknown>;
};

export type AppointmentBookingList = {
  data: AppointmentBooking[];
  total: number;
  page: number;
  limit: number;
};

export type WhatsAppConfig = {
  id: string;
  organizationId: string;
  provider: "meta" | "twilio" | "custom";
  status: "active" | "inactive";
  name: string;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  hasAccessToken: boolean;
  hasWebhookVerifyToken: boolean;
  hasAppSecret: boolean;
  defaultLocale: string;
  settings: Record<string, unknown>;
};

export type WhatsAppMessage = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  role: "contact" | "assistant" | "agent" | "system";
  type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "sticker"
    | "location"
    | "unknown";
  providerMessageId?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WhatsAppConversation = {
  id: string;
  organizationId: string;
  configId: string;
  status: "open" | "waiting_for_agent" | "closed";
  contactWaId: string;
  contactName?: string | null;
  contactPhone?: string | null;
  locale: string;
  assignedAgentId?: string | null;
  sessionExpiresAt?: string | null;
  lastMessageAt: string;
  metadata: Record<string, unknown>;
  messages: WhatsAppMessage[];
};

export type WhatsAppConversationList = {
  data: WhatsAppConversation[];
  total: number;
  page: number;
  limit: number;
};

export type VoiceConfig = {
  id: string;
  organizationId: string;
  provider: "twilio" | "sip" | "custom";
  status: "active" | "inactive";
  name: string;
  phoneNumber?: string | null;
  sipDomain?: string | null;
  hasWebhookVerifyToken: boolean;
  hasApiKey: boolean;
  sttProvider?: string | null;
  sttModel?: string | null;
  ttsProvider?: string | null;
  ttsVoice?: string | null;
  defaultLocale: string;
  transferPhoneNumber?: string | null;
  voicemailEnabled: boolean;
  settings: Record<string, unknown>;
};

export type VoiceCallEvent = {
  id: string;
  callId: string;
  type:
    | "call_started"
    | "stt_partial"
    | "transcript"
    | "assistant_response"
    | "tts_started"
    | "barge_in"
    | "route_decision"
    | "transfer_requested"
    | "voicemail"
    | "call_ended"
    | "system";
  role: string;
  content?: string | null;
  confidence?: number | null;
  audioUrl?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VoiceCall = {
  id: string;
  organizationId: string;
  configId: string;
  status:
    | "ringing"
    | "in_progress"
    | "waiting_for_agent"
    | "transferred"
    | "voicemail"
    | "completed"
    | "failed";
  providerCallId?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  callerName?: string | null;
  locale: string;
  assignedAgentId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  lastEventAt: string;
  summary?: string | null;
  metadata: Record<string, unknown>;
  events: VoiceCallEvent[];
};

export type VoiceCallList = {
  data: VoiceCall[];
  total: number;
  page: number;
  limit: number;
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
  | "organizations"
  | "inbox"
  | "knowledge"
  | "appointments"
  | "whatsapp"
  | "voice"
  | "widget"
  | "users"
  | "products"
  | "ai"
  | "audit";
