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
  isSystem?: boolean;
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
  priority: number;
  name: string;
  baseUrl?: string | null;
  hasApiKey: boolean;
  chatModel?: string | null;
  embeddingModel?: string | null;
  settings: Record<string, unknown>;
  validationStatus: "untested" | "verified" | "failed" | string;
  lastValidatedAt?: string | null;
  validationLatency?: number | null;
  validationError?: string | null;
  validatedModels: string[];
  usage?: {
    periodStart: string;
    periodEnd: string;
    requests: number;
    successes: number;
    failures: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    averageLatencyMs: number;
    estimatedCostUsd: number;
    monthlyBudgetUsd: number | null;
    budgetMode: "tracking" | "warn" | "block";
    budgetExceeded: boolean;
    remainingBudgetUsd: number | null;
    budgetUsedPercent: number | null;
    pricingConfigured: boolean;
    modelPricing: Array<{
      model: string;
      capability: string;
      inputPerMillionUsd: number | null;
      outputPerMillionUsd: number | null;
      source:
        | "provider_catalog"
        | "workspace_override"
        | "workspace_default"
        | "not_configured";
      catalogUpdatedAt: string | null;
      catalogVersion: string | null;
      catalogSourceUrl: string | null;
    }>;
    vendorBalance: {
      status: string;
      remainingUsd: number | null;
      reason: string;
    };
    breakdown: Array<{
      date: string;
      capability: string;
      model: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }>;
  };
};

export type KnowledgeOcrProvider = {
  id: string;
  organizationId: string;
  name: string;
  provider:
    | "local_tesseract"
    | "aws_textract"
    | "google_document_ai"
    | "azure_document_intelligence"
    | "custom";
  status: "active" | "inactive";
  endpoint: string;
  hasApiKey: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeExtractionSettings = {
  id: string | null;
  organizationId: string;
  configured: boolean;
  ocrMode: "disabled" | "fallback" | "always";
  primaryOcrProviderId: string | null;
  fallbackOcrProviderId: string | null;
  embeddingProviderId: string | null;
  nativeTextMinCharacters: number;
  nativeTextMinAlphanumericRatio: number;
  ocrMinConfidence: number;
  ocrTimeoutMs: number;
  ocrMaxRetries: number;
  ocrPageConcurrency: number;
  ocrRenderWidth: number;
  maxPdfPages: number;
  maxExtractedCharacters: number;
  settings: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
  deploymentLimits: {
    maxPdfPages: number;
    maxExtractedCharacters: number;
    maxOcrPageConcurrency: number;
    maxOcrRenderWidth: number;
    maxOcrTimeoutMs: number;
    maxOcrRetries: number;
  };
};

export type KnowledgeExtractionSettingsInput = Omit<
  KnowledgeExtractionSettings,
  | "id"
  | "organizationId"
  | "configured"
  | "createdAt"
  | "updatedAt"
  | "deploymentLimits"
>;

export type KnowledgeOcrProviderInput = {
  name: string;
  provider: KnowledgeOcrProvider["provider"];
  status: KnowledgeOcrProvider["status"];
  endpoint: string;
  apiKey?: string;
  settings?: Record<string, unknown>;
};

export type Message = {
  id: string;
  role: "visitor" | "assistant" | "agent" | "system";
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  citations: Array<{ chunkId: string; score: number; content?: string }>;
};

export type Conversation = {
  id: string;
  organizationId: string;
  status: "open" | "waiting_for_agent" | "closed";
  version: number;
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
  id: string;
  organizationId: string;
  name: string;
  widgetKey: string;
  enabled: boolean;
  knowledgeScope: "all" | "folders";
  folderIds: string[];
  greetingText: string;
  allowedDomains: string[];
  settings: Record<string, unknown>;
};

export type WidgetPageInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type WidgetConfigList = WidgetPageInfo & {
  data: WidgetConfig[];
};

export type PublicWidgetConversationCreated = {
  conversation: Conversation;
  visitorToken: string;
};

export type CustomerChatSendMessageResponse = {
  conversation: Conversation;
  visitorMessage: Message;
  assistantMessage: Message | null;
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
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  rawText?: string | null;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
  lastIngestedAt?: string | null;
  contentFingerprint?: string | null;
  version?: number;
  malwareScanStatus?: string;
  malwareScanMessage?: string | null;
  recrawlIntervalHours?: number | null;
  lastCrawledAt?: string | null;
  nextCrawlAt?: string | null;
  staleAfterAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  latestIngestionRun?: KnowledgeIngestionRun | null;
};

export type KnowledgeIngestionRun = {
  id: string;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "dead_letter";
  stage: string;
  progressPercent: number;
  processedItems: number;
  totalItems: number;
  attempt: number;
  maxAttempts: number;
  cancellationRequestedAt?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type KnowledgePageInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type KnowledgeSourceList = {
  data: KnowledgeSource[];
  pageInfo: KnowledgePageInfo;
};

export type KnowledgeSourceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  folderId?: string;
  quarantined?: boolean;
};

export type KnowledgeSourceVersion = {
  id: string;
  version: number;
  contentFingerprint: string;
  documentCount: number;
  chunkCount: number;
  metadata: Record<string, unknown>;
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
  maxAttendees: number;
  cancellationWindowMinutes?: number | null;
  rescheduleWindowMinutes?: number | null;
  waitlistEnabled: boolean;
  reminderOffsetsMinutes: number[];
  reminderTemplates: Record<string, string>;
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

export type AppointmentResource = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  capacity: number;
  status: "active" | "inactive";
  metadata: Record<string, unknown>;
};

export type AppointmentSlot = {
  staffId: string;
  staffName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  seatsRemaining: number;
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
  partySize: number;
  isGroupBooking: boolean;
  checkedInAt?: string | null;
  seriesId?: string | null;
  occurrenceIndex?: number | null;
  startAt: string;
  endAt: string;
  timezone: string;
  notes?: string | null;
  cancellationReason?: string | null;
  metadata: Record<string, unknown>;
  manageToken?: string;
};

export type AppointmentPolicy = {
  organizationId: string;
  cancellationWindowMinutes: number;
  rescheduleWindowMinutes: number;
  noShowGraceMinutes: number;
  waitlistOfferMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  reminderOffsetsMinutes: number[];
  reminderTemplates: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export type AppointmentBlackout = {
  id: string;
  organizationId: string;
  name: string;
  startAt: string;
  endAt: string;
  annual: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentWaitlistEntry = {
  id: string;
  organizationId: string;
  serviceId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  partySize: number;
  status: "waiting" | "offered" | "claimed" | "expired" | "cancelled";
  position: number;
  offerExpiresAt?: string | null;
  claimedBookingId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentScheduleFeed = {
  bookings: AppointmentBooking[];
  availability: Array<{
    id: string;
    staffId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    staff: { name: string; timezone: string };
  }>;
  staffTimeOff: Array<{
    id: string;
    staffId: string;
    startAt: string;
    endAt: string;
    reason?: string | null;
    staff: { name: string; timezone: string };
  }>;
  resourceTimeOff: Array<{
    id: string;
    resourceId: string;
    startAt: string;
    endAt: string;
    reason?: string | null;
    resource: { name: string; type: string };
  }>;
  blackouts: AppointmentBlackout[];
  waitlist: Array<AppointmentWaitlistEntry & {
    service: { name: string };
    staff: { name: string };
  }>;
  externalBusy: Array<{
    id: string;
    staffId: string;
    staffName: string;
    timezone: string;
    startAt: string;
    endAt: string;
  }>;
  calendarFailures: Array<{
    id: string;
    bookingId: string;
    status: "failed" | "dead_letter";
    lastError?: string | null;
    booking: { startAt: string; endAt: string; customerName: string };
    connection: { provider: "google" | "microsoft"; staffId: string };
  }>;
};

export type AppointmentDeadLetterBooking = {
  id: string;
  customerName: string;
  startAt: string;
  service: { id: string; name: string };
};

export type AppointmentReminderDeadLetter = {
  id: string;
  bookingId: string;
  reminderType: string;
  dueAt: string;
  attempts: number;
  lastError?: string | null;
  updatedAt: string;
  booking: AppointmentDeadLetterBooking;
};

export type AppointmentCalendarDeadLetter = {
  id: string;
  bookingId: string;
  operation: string;
  attempts: number;
  lastError?: string | null;
  updatedAt: string;
  booking: AppointmentDeadLetterBooking;
  connection: {
    id: string;
    provider: "google" | "microsoft";
    accountEmail?: string | null;
  };
};

export type AppointmentDeadLetters = {
  reminders: AppointmentReminderDeadLetter[];
  calendarEvents: AppointmentCalendarDeadLetter[];
};

export type AppointmentBookingList = {
  data: AppointmentBooking[];
  total: number;
  page: number;
  limit: number;
};

export type AppointmentCalendarConnection = {
  id: string;
  organizationId: string;
  staffId: string;
  provider: "google" | "microsoft";
  status: "pending" | "active" | "error" | "disconnected";
  accountEmail?: string | null;
  calendarId: string;
  calendarName?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  staff?: { id: string; name: string; timezone: string };
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
    | "template"
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
  deliveryStatus?: string | null;
  deliveryError?: string | null;
  deliveryAttempts: number;
  deliveredAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WhatsAppTemplate = {
  id: string;
  configId: string;
  name: string;
  language: string;
  status: string;
  category?: string | null;
  components: unknown[];
  source: "local" | "meta" | string;
  providerTemplateId?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  syncedAt: string;
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
  durationSeconds?: number | null;
  recordingSid?: string | null;
  recordingUrl?: string | null;
  recordingDurationSeconds?: number | null;
  lastEventAt: string;
  summary?: string | null;
  metadata: Record<string, unknown>;
  events: VoiceCallEvent[];
};

export type VoiceConfigInput = {
  organizationId?: string;
  name: string;
  provider: VoiceConfig["provider"];
  status: VoiceConfig["status"];
  phoneNumber?: string | null;
  sipDomain?: string | null;
  webhookVerifyToken?: string | null;
  apiKey?: string | null;
  sttProvider?: string | null;
  sttModel?: string | null;
  ttsProvider?: string | null;
  ttsVoice?: string | null;
  defaultLocale: string;
  transferPhoneNumber?: string | null;
  voicemailEnabled: boolean;
  settings: Record<string, unknown>;
};

export type VoiceCallFilters = {
  status: string;
  search: string;
  page: number;
  limit: number;
};

export type VoiceAnalytics = {
  periodDays: number;
  totalCalls: number;
  inProgress: number;
  completed: number;
  transferred: number;
  voicemail: number;
  failed: number;
  waitingForAgent: number;
  averageDurationSeconds: number;
  containmentRate: number;
  transferRate: number;
  bargeIns: number;
  assistantResponses: number;
  generatedAt: string;
};

export type VoiceRuntimeHealth = {
  status: string;
  transport: string;
  activeSessions: number;
  sessions: Array<{
    configId: string;
    providerCallId: string;
    connectedAt: string;
    lastEventAt: string;
    ageSeconds: number;
  }>;
  checkedAt: string;
};

export type VoiceConfigDiagnostic = {
  configId: string;
  ready: boolean;
  checks: Record<string, boolean>;
  providerTest: {
    provider: string;
    reachable: boolean;
    liveControlSupported: boolean;
    message?: string;
    accountSid?: string;
    accountStatus?: string;
  };
  checkedAt: string;
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

export type FormHandler = (
  event: FormEvent<HTMLFormElement>,
) => void | Promise<void>;

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
