"use client";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  MoonStar,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  Users2,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { AIProvidersView } from "@/components/ai-providers-view";
import { AppointmentsView } from "@/components/appointments-view";
import { AuditView } from "@/components/audit-view";
import { DashboardView } from "@/components/dashboard-view";
import { InboxView } from "@/components/inbox-view";
import { KnowledgeView } from "@/components/knowledge-view";
import { LoginPanel } from "@/components/login-panel";
import { OrganizationsView } from "@/components/organizations-view";
import { ProductsView } from "@/components/products-view";
import { StatusPill } from "@/components/ui";
import { UsersView } from "@/components/users-view";
import { VoiceReceptionistView } from "@/components/voice-receptionist-view";
import { WidgetView } from "@/components/widget-view";
import { WhatsAppView } from "@/components/whatsapp-view";
import type {
  AIProvider,
  ApiState,
  AppointmentBooking,
  AppointmentBookingList,
  AppointmentBlackout,
  AppointmentCalendarConnection,
  AppointmentPolicy,
  AppointmentResource,
  AppointmentService,
  AppointmentSlot,
  AppointmentStaff,
  AppointmentWaitlistEntry,
  AuditLog,
  AuthResponse,
  Conversation,
  ConversationList,
  CustomerChatSendMessageResponse,
  Health,
  InviteResponse,
  KnowledgeSource,
  KnowledgeCategory,
  KnowledgeFolder,
  KnowledgeExtractionSettings,
  KnowledgeExtractionSettingsInput,
  KnowledgeOcrProvider,
  KnowledgeOcrProviderInput,
  KnowledgePageInfo,
  KnowledgeSourceList,
  KnowledgeSourceQuery,
  KnowledgeSourceVersion,
  ObservabilitySummary,
  Organization,
  PasswordResetRequestResponse,
  ProductEntitlement,
  ProductKey,
  PublicWidgetConversationCreated,
  TabId,
  User,
  VoiceCall,
  VoiceCallFilters,
  VoiceCallList,
  VoiceConfig,
  VoiceConfigInput,
  WidgetConfig,
  WidgetConfigList,
  WidgetPageInfo,
  WhatsAppConfig,
  WhatsAppConversation,
  WhatsAppConversationList,
  WhatsAppMessage,
  WhatsAppTemplate,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

type ThemeMode = "light" | "dark";

const navItems: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "organizations", label: "Organizations" },
  { id: "inbox", label: "Inbox" },
  { id: "knowledge", label: "Knowledge" },
  { id: "appointments", label: "Appointments" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "voice", label: "Voice" },
  { id: "widget", label: "Widget" },
  { id: "users", label: "Users" },
  { id: "products", label: "Products" },
  { id: "ai", label: "AI Providers" },
  { id: "audit", label: "Audit" },
];

const validTabIds = new Set<TabId>(navItems.map((item) => item.id));

const navMeta: Record<
  TabId,
  { icon: LucideIcon; mark: string; description: string }
> = {
  dashboard: {
    icon: LayoutDashboard,
    mark: "DB",
    description: "Live platform overview",
  },
  organizations: {
    icon: Building2,
    mark: "OR",
    description: "Tenants, plans and ownership",
  },
  inbox: {
    icon: MessagesSquare,
    mark: "CH",
    description: "Customer conversations and handoff",
  },
  knowledge: {
    icon: BookOpenText,
    mark: "KN",
    description: "Sources, ingestion and access levels",
  },
  appointments: {
    icon: CalendarDays,
    mark: "AP",
    description: "Services, availability and bookings",
  },
  whatsapp: {
    icon: MessageSquare,
    mark: "WA",
    description: "WhatsApp automation and support",
  },
  voice: {
    icon: PhoneCall,
    mark: "VO",
    description: "Calls, routing and transcripts",
  },
  widget: {
    icon: Waypoints,
    mark: "WG",
    description: "Website assistant configuration",
  },
  users: {
    icon: Users2,
    mark: "US",
    description: "Roles, clearance and product access",
  },
  products: {
    icon: Boxes,
    mark: "PR",
    description: "Organization product entitlements",
  },
  ai: {
    icon: Bot,
    mark: "AI",
    description: "Models, providers and credentials",
  },
  audit: {
    icon: ShieldCheck,
    mark: "AU",
    description: "Security and operations activity",
  },
};

export default function Home() {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [health, setHealth] = useState<Health | null>(null);
  const [observability, setObservability] =
    useState<ObservabilitySummary | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductEntitlement[]>([]);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [knowledgeExtractionSettings, setKnowledgeExtractionSettings] =
    useState<KnowledgeExtractionSettings | null>(null);
  const [knowledgeOcrProviders, setKnowledgeOcrProviders] = useState<
    KnowledgeOcrProvider[]
  >([]);
  const [knowledgeSettingsError, setKnowledgeSettingsError] = useState<
    string | null
  >(null);
  const [conversations, setConversations] = useState<ConversationList | null>(
    null,
  );
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([]);
  const [widgetPageInfo, setWidgetPageInfo] = useState<WidgetPageInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [widgetTestConversation, setWidgetTestConversation] =
    useState<Conversation | null>(null);
  const [widgetVisitorToken, setWidgetVisitorToken] = useState<string | null>(
    null,
  );
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(
    [],
  );
  const [knowledgeCategories, setKnowledgeCategories] = useState<
    KnowledgeCategory[]
  >([]);
  const [knowledgeFolders, setKnowledgeFolders] = useState<KnowledgeFolder[]>(
    [],
  );
  const [knowledgePageInfo, setKnowledgePageInfo] = useState<KnowledgePageInfo>(
    {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    },
  );
  const [knowledgeQuery, setKnowledgeQuery] = useState<KnowledgeSourceQuery>({
    page: 1,
    limit: 25,
  });
  const [appointmentServices, setAppointmentServices] = useState<
    AppointmentService[]
  >([]);
  const [appointmentStaff, setAppointmentStaff] = useState<AppointmentStaff[]>(
    [],
  );
  const [appointmentResources, setAppointmentResources] = useState<
    AppointmentResource[]
  >([]);
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>(
    [],
  );
  const [appointmentBookings, setAppointmentBookings] = useState<
    AppointmentBooking[]
  >([]);
  const [appointmentCalendarConnections, setAppointmentCalendarConnections] =
    useState<AppointmentCalendarConnection[]>([]);
  const [appointmentPolicy, setAppointmentPolicy] =
    useState<AppointmentPolicy | null>(null);
  const [appointmentBlackouts, setAppointmentBlackouts] = useState<
    AppointmentBlackout[]
  >([]);
  const [appointmentWaitlist, setAppointmentWaitlist] = useState<
    AppointmentWaitlistEntry[]
  >([]);
  const [whatsAppConfigs, setWhatsAppConfigs] = useState<WhatsAppConfig[]>([]);
  const [selectedWhatsAppConfigId, setSelectedWhatsAppConfigId] = useState<
    string | null
  >(null);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<
    WhatsAppTemplate[]
  >([]);
  const [whatsAppConversations, setWhatsAppConversations] =
    useState<WhatsAppConversationList | null>(null);
  const [selectedWhatsAppConversation, setSelectedWhatsAppConversation] =
    useState<WhatsAppConversation | null>(null);
  const [voiceConfigs, setVoiceConfigs] = useState<VoiceConfig[]>([]);
  const [voiceCalls, setVoiceCalls] = useState<VoiceCallList | null>(null);
  const [selectedVoiceCall, setSelectedVoiceCall] = useState<VoiceCall | null>(
    null,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    message: null,
  });
  const [filters, setFilters] = useState({
    status: "waiting_for_agent",
    search: "",
  });
  const [whatsAppFilters, setWhatsAppFilters] = useState({
    status: "waiting_for_agent",
    search: "",
    page: 1,
    limit: 30,
  });
  const [voiceFilters, setVoiceFilters] = useState({
    status: "waiting_for_agent",
    search: "",
    page: 1,
    limit: 30,
  });

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const workspaceOrganization = useMemo(
    () =>
      (user?.roles.includes("super_admin")
        ? organizations.find((item) => item.id === selectedOrganizationId)
        : null) ?? organization,
    [organization, organizations, selectedOrganizationId, user],
  );
  const isSuperAdminPlatformContext = Boolean(
    user?.roles.includes("super_admin") && !selectedOrganizationId,
  );
  const voiceAccess = useMemo(() => {
    const roles = user?.roles ?? [];
    const grants = [
      ...(user?.productAccess ?? []),
      ...(user?.customRoles ?? []).flatMap((role) => role.productAccess),
    ].filter((grant) => grant.productKey === "voice_receptionist");
    return {
      canConfigure:
        roles.includes("super_admin") ||
        roles.includes("org_admin") ||
        grants.some((grant) => grant.canConfigure),
      canManageAgents:
        roles.includes("super_admin") ||
        roles.includes("org_admin") ||
        grants.some((grant) => grant.canManageAgents),
    };
  }, [user]);
  const whatsAppAccess = useMemo(() => {
    const roles = user?.roles ?? [];
    const grants = [
      ...(user?.productAccess ?? []),
      ...(user?.customRoles ?? []).flatMap((role) => role.productAccess),
    ].filter((grant) => grant.productKey === "whatsapp_assistant");
    return {
      canConfigure:
        roles.includes("super_admin") ||
        roles.includes("org_admin") ||
        roles.includes("product_admin") ||
        grants.some((grant) => grant.canConfigure),
      canManageAgents:
        roles.includes("super_admin") ||
        roles.includes("org_admin") ||
        grants.some((grant) => grant.canManageAgents),
    };
  }, [user]);
  const usesPlatformTestWorkspace =
    isSuperAdminPlatformContext &&
    [
      "inbox",
      "knowledge",
      "appointments",
      "whatsapp",
      "voice",
      "widget",
      "products",
      "ai",
    ].includes(activeTab);

  const visibleNavItems = useMemo(() => {
    if (!user) return navItems.filter((item) => item.id === "dashboard");
    const isSuperAdmin = user.roles.includes("super_admin");
    const isOrgAdmin = user.roles.includes("org_admin");
    const canHandleCustomerChat = user.roles.some((role) =>
      ["super_admin", "org_admin", "product_admin", "agent"].includes(role),
    );
    const grants = [
      ...(user.productAccess ?? []),
      ...(user.customRoles ?? []).flatMap((role) => role.productAccess),
    ];
    const isEnabled = (productKey: ProductKey) =>
      products.some(
        (item) => item.product.key === productKey && item.status === "enabled",
      );
    const canConfigureChat =
      isSuperAdmin ||
      isOrgAdmin ||
      grants.some(
        (access) =>
          access.productKey === "customer_chat" && access.canConfigure,
      );
    const canUse = (productKey: ProductKey) =>
      isEnabled(productKey) &&
      (isSuperAdmin ||
        isOrgAdmin ||
        grants.some(
          (access) => access.productKey === productKey && access.canUse,
        ));
    const canManageAgents = grants.some((access) => access.canManageAgents);
    const canManageKnowledge = grants.some(
      (access) => access.canManageKnowledge || access.canConfigure,
    );
    return navItems.filter((item) => {
      if (item.id === "organizations") return isSuperAdmin;
      if (item.id === "users")
        return isSuperAdmin || isOrgAdmin || canManageAgents;
      if (item.id === "knowledge")
        return isSuperAdmin || isOrgAdmin || canManageKnowledge;
      if (["products", "ai", "audit"].includes(item.id))
        return isSuperAdmin || isOrgAdmin;
      if (item.id === "inbox")
        return canUse("customer_chat") && canHandleCustomerChat;
      if (item.id === "widget")
        return canUse("customer_chat") && canConfigureChat;
      if (item.id === "appointments") return canUse("appointment_booking");
      if (item.id === "whatsapp") return canUse("whatsapp_assistant");
      if (item.id === "voice") return canUse("voice_receptionist");
      return true;
    });
  }, [products, user]);

  useEffect(() => {
    const restoreSession = window.setTimeout(() => {
      try {
        const storedUser = window.localStorage.getItem("agentcore_user");
        const storedTheme = window.localStorage.getItem("agentcore_theme");
        const storedTab = window.localStorage.getItem("agentcore_active_tab");
        setToken(window.localStorage.getItem("agentcore_token"));
        setRefreshToken(window.localStorage.getItem("agentcore_refresh_token"));
        setUser(storedUser ? (JSON.parse(storedUser) as User) : null);
        setTheme(storedTheme === "dark" ? "dark" : "light");
        if (storedTab && validTabIds.has(storedTab as TabId)) {
          setActiveTab(storedTab as TabId);
        }
      } catch {
        clearSession();
      } finally {
        setIsSessionReady(true);
      }
    }, 0);
    void loadHealth();
    return () => window.clearTimeout(restoreSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("agentcore_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("agentcore_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!token) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (
      !token ||
      !selectedOrganizationId ||
      !user?.roles.includes("super_admin")
    )
      return;
    void loadSelectedOrganizationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId]);

  useEffect(() => {
    if (!token || activeTab !== "inbox") return;
    const controller = new AbortController();
    const selectedId = selectedConversation?.id;
    const organizationId = selectedOrganizationId ?? user?.orgId;

    async function connect() {
      try {
        const params = new URLSearchParams();
        if (organizationId) params.set("organizationId", organizationId);
        const response = await fetch(
          `${API_BASE_URL}/customer-chat/events?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const result = await reader.read();
          if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          if (blocks.some((block) => !block.includes("event: heartbeat"))) {
            await loadConversations();
            if (selectedId) await loadConversation(selectedId);
          }
        }
      } catch {
        // Expected during navigation, reconnect, or sign-out.
      }
      if (!controller.signal.aborted) {
        window.setTimeout(() => void connect(), 3000);
      }
    }

    void connect();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, selectedOrganizationId, selectedConversation?.id]);

  useEffect(() => {
    if (!token || activeTab !== "voice") return;
    const interval = window.setInterval(() => {
      void loadVoiceCalls(undefined, true);
      if (selectedVoiceCall?.id) {
        void loadVoiceCall(selectedVoiceCall.id, true);
      }
    }, 10_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    activeTab,
    selectedOrganizationId,
    selectedVoiceCall?.id,
    voiceFilters,
  ]);

  useEffect(() => {
    if (!token || activeTab !== "whatsapp") return;
    const interval = window.setInterval(() => {
      void loadWhatsAppConversations(undefined, true);
      if (selectedWhatsAppConversation?.id) {
        void loadWhatsAppConversation(selectedWhatsAppConversation.id, true);
      }
    }, 10_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    activeTab,
    selectedOrganizationId,
    selectedWhatsAppConversation?.id,
    whatsAppFilters,
  ]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await axios.request<T>({
      url: `${API_BASE_URL}${path}`,
      method: (init?.method ?? "GET") as AxiosRequestConfig["method"],
      headers: {
        ...authHeaders,
        ...normalizeHeaders(init?.headers),
      },
      data: parseRequestBody(init?.body),
      validateStatus: () => true,
    });

    if (response.status === 401 && !path.startsWith("/auth/")) {
      const refreshed = await refreshSession();

      if (refreshed) {
        const retry = await axios.request<T>({
          url: `${API_BASE_URL}${path}`,
          method: (init?.method ?? "GET") as AxiosRequestConfig["method"],
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshed.accessToken}`,
            ...normalizeHeaders(init?.headers),
          },
          data: parseRequestBody(init?.body),
          validateStatus: () => true,
        });

        return handleAxiosResponse(retry);
      }
    }

    return handleAxiosResponse(response);
  }

  async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await axios.request<T>({
      url: `${API_BASE_URL}${path}`,
      method: (init?.method ?? "GET") as AxiosRequestConfig["method"],
      headers: {
        "Content-Type": "application/json",
        ...normalizeHeaders(init?.headers),
      },
      data: parseRequestBody(init?.body),
      validateStatus: () => true,
    });

    return handleAxiosResponse(response);
  }

  async function uploadApi<T>(path: string, body: FormData): Promise<T> {
    const response = await axios.request<T>({
      url: `${API_BASE_URL}${path}`,
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      data: body,
      validateStatus: () => true,
    });

    if (response.status === 401) {
      const refreshed = await refreshSession();

      if (refreshed) {
        const retry = await axios.request<T>({
          url: `${API_BASE_URL}${path}`,
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
          },
          data: body,
          validateStatus: () => true,
        });

        return handleAxiosResponse(retry);
      }
    }

    return handleAxiosResponse(response);
  }

  async function refreshSession(): Promise<AuthResponse | null> {
    const storedRefreshToken =
      refreshToken ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem("agentcore_refresh_token")
        : null);

    if (!storedRefreshToken) {
      clearSession();
      return null;
    }

    const response = await axios.request<AuthResponse>({
      url: `${API_BASE_URL}/auth/refresh`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { refreshToken: storedRefreshToken },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      clearSession();
      return null;
    }

    persistSession(response.data);
    return response.data;
  }

  function handleAxiosResponse<T>(response: AxiosResponse<T>): T {
    if (response.status === 401) {
      clearSession();
      throw new Error("Session expired. Please sign in again.");
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        getApiErrorMessage(response.data) ||
          `Request failed with ${response.status}`,
      );
    }

    return response.data;
  }

  function parseRequestBody(body?: BodyInit | null): unknown {
    if (!body) return undefined;

    if (typeof body !== "string") {
      return body;
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }

  function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};

    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }

    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }

    return headers;
  }

  function getApiErrorMessage(data: unknown): string | null {
    if (!data) return null;

    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;

      if (typeof message === "string") {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(", ");
      }
    }

    return JSON.stringify(data);
  }

  async function run<T>(task: () => Promise<T>, success?: string) {
    setState({ loading: true, error: null, message: null });

    try {
      const result = await task();
      setState({ loading: false, error: null, message: success ?? null });
      return result;
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Something failed",
        message: null,
      });
      return null;
    }
  }

  async function loadAll() {
    if (!user) return;
    const isSuperAdmin = user.roles.includes("super_admin");
    const isOrgAdmin = user.roles.includes("org_admin");
    const grants = [
      ...(user.productAccess ?? []),
      ...(user.customRoles ?? []).flatMap((role) => role.productAccess),
    ];
    const canManageAgents = grants.some((access) => access.canManageAgents);
    const canManageKnowledge = grants.some(
      (access) => access.canManageKnowledge || access.canConfigure,
    );
    const loadedProducts = await loadProducts();
    const isEnabled = (productKey: ProductKey) =>
      Boolean(
        loadedProducts?.some(
          (item) =>
            item.product.key === productKey && item.status === "enabled",
        ),
      );
    const canUse = (productKey: ProductKey) =>
      isEnabled(productKey) &&
      (isSuperAdmin ||
        isOrgAdmin ||
        grants.some(
          (access) => access.productKey === productKey && access.canUse,
        ));

    const baseTasks: Array<Promise<unknown>> = [
      loadHealth(),
      loadOrganization(),
    ];
    if (isSuperAdmin) baseTasks.push(loadOrganizations());
    if (isSuperAdmin || isOrgAdmin) {
      baseTasks.push(
        loadObservability(),
        loadAIProviders(),
        loadKnowledgeSettings(),
        loadAuditLogs(),
      );
    }
    if (isSuperAdmin || isOrgAdmin || canManageAgents) {
      baseTasks.push(loadUsers());
    }
    if (isSuperAdmin || isOrgAdmin || canManageKnowledge) {
      baseTasks.push(loadKnowledgeSources());
    }
    if (canUse("customer_chat")) {
      baseTasks.push(loadConversations(), loadWidgetConfig());
    }
    if (canUse("appointment_booking")) {
      baseTasks.push(
        loadAppointmentServices(),
        loadAppointmentStaff(),
        loadAppointmentResources(),
        loadAppointmentBookings(),
        loadAppointmentCalendarConnections(),
        loadAppointmentOperations(),
      );
    }
    if (canUse("whatsapp_assistant")) {
      baseTasks.push(loadWhatsAppConfigs(), loadWhatsAppConversations());
    }
    if (canUse("voice_receptionist")) {
      baseTasks.push(loadVoiceConfigs(), loadVoiceCalls());
    }
    await Promise.all(baseTasks);
  }

  async function loadSelectedOrganizationData() {
    setProducts([]);
    setConversations(null);
    setSelectedConversation(null);
    setWidgetConfigs([]);
    setWidgetConfig(null);
    setWidgetTestConversation(null);
    setWidgetVisitorToken(null);
    setKnowledgeExtractionSettings(null);
    setKnowledgeOcrProviders([]);
    setKnowledgeSettingsError(null);
    setAIProviders([]);
    setWhatsAppConfigs([]);
    setWhatsAppTemplates([]);
    setSelectedWhatsAppConfigId(null);
    setWhatsAppConversations(null);
    setSelectedWhatsAppConversation(null);
    const loadedProducts = await loadProducts();
    const isEnabled = (productKey: ProductKey) =>
      Boolean(
        loadedProducts?.some(
          (item) =>
            item.product.key === productKey && item.status === "enabled",
        ),
      );
    const tasks: Array<Promise<unknown>> = [
      loadUsers(),
      loadKnowledgeSources(),
      loadAIProviders(),
      loadKnowledgeSettings(),
    ];

    if (isEnabled("customer_chat")) {
      tasks.push(loadConversations(), loadWidgetConfig());
    }
    if (isEnabled("appointment_booking")) {
      tasks.push(
        loadAppointmentServices(),
        loadAppointmentStaff(),
        loadAppointmentResources(),
        loadAppointmentBookings(),
        loadAppointmentCalendarConnections(),
        loadAppointmentOperations(),
      );
    }
    if (isEnabled("whatsapp_assistant")) {
      tasks.push(loadWhatsAppConfigs(), loadWhatsAppConversations());
    }
    if (isEnabled("voice_receptionist")) {
      tasks.push(loadVoiceConfigs(), loadVoiceCalls());
    }
    await Promise.all(tasks);
  }

  async function loadHealth() {
    const result = await run(() => api<Health>("/health"));
    if (result) setHealth(result);
  }

  async function loadObservability() {
    const result = await run(() =>
      api<ObservabilitySummary>("/observability/summary"),
    );
    if (result) setObservability(result);
  }

  async function loadOrganization() {
    const result = await run(() => api<Organization>("/organizations/me"));
    if (result) setOrganization(result);
  }

  async function loadOrganizations() {
    const result = await run(() => api<Organization[]>("/organizations"));
    if (result) {
      setOrganizations(result);
    }
    return result;
  }

  async function loadUsers() {
    const result = await run(() => api<User[]>("/users"));
    if (result) setUsers(result);
  }

  async function loadProducts() {
    const path =
      user?.roles.includes("super_admin") && selectedOrganizationId
        ? `/organizations/${selectedOrganizationId}/products`
        : "/organizations/me/products";
    const result = await run(() => api<ProductEntitlement[]>(path));
    if (result) setProducts(result);
    return result;
  }

  async function loadAIProviders() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() => api<AIProvider[]>(`/ai/providers${query}`));
    if (result) setAIProviders(result);
  }

  async function loadKnowledgeSettings() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    setKnowledgeSettingsError(null);
    try {
      const result = await Promise.all([
        api<KnowledgeExtractionSettings>(
          `/knowledge/settings/extraction${query}`,
        ),
        api<KnowledgeOcrProvider[]>(
          `/knowledge/settings/ocr-providers${query}`,
        ),
      ]);
      setKnowledgeExtractionSettings(result[0]);
      setKnowledgeOcrProviders(result[1]);
      return true;
    } catch (error) {
      setKnowledgeSettingsError(
        error instanceof Error
          ? error.message
          : "Unable to load processing settings",
      );
      return false;
    }
  }

  async function loadConversations() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams({
      limit: "30",
      ...(organizationId ? { organizationId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
    const result = await run(() =>
      api<ConversationList>(`/customer-chat/conversations?${params}`),
    );

    if (result) {
      setConversations(result);
      setSelectedConversation((current) =>
        current
          ? (result.data.find((item) => item.id === current.id) ?? current)
          : (result.data[0] ?? null),
      );
    }
  }

  async function loadConversation(id: string) {
    const result = await run(() =>
      api<Conversation>(`/customer-chat/conversations/${id}`),
    );
    if (result) setSelectedConversation(result);
  }

  async function loadWidgetConfig(page = 1) {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (organizationId) params.set("organizationId", organizationId);
    const result = await run(() =>
      api<WidgetConfigList>(
        `/customer-chat/widget-configs?${params.toString()}`,
      ),
    );
    if (result) {
      setWidgetConfigs(result.data);
      setWidgetPageInfo({
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
      setWidgetConfig((current) =>
        current
          ? (result.data.find((widget) => widget.id === current.id) ?? current)
          : null,
      );
    }
  }

  async function loadKnowledgeSources(queryOverride?: KnowledgeSourceQuery) {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const nextQuery = queryOverride ?? knowledgeQuery;
    if (queryOverride) setKnowledgeQuery(nextQuery);
    const sourceParams = new URLSearchParams();
    if (organizationId) sourceParams.set("organizationId", organizationId);
    sourceParams.set("page", String(nextQuery.page ?? 1));
    sourceParams.set("limit", String(nextQuery.limit ?? 25));
    if (nextQuery.search) sourceParams.set("search", nextQuery.search);
    if (nextQuery.status) sourceParams.set("status", nextQuery.status);
    if (nextQuery.type) sourceParams.set("type", nextQuery.type);
    if (nextQuery.folderId) sourceParams.set("folderId", nextQuery.folderId);
    if (nextQuery.quarantined !== undefined)
      sourceParams.set("quarantined", String(nextQuery.quarantined));
    const taxonomyQuery = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      Promise.all([
        api<KnowledgeSourceList>(
          `/knowledge/sources?${sourceParams.toString()}`,
        ),
        api<KnowledgeCategory[]>(
          `/knowledge/taxonomy/categories${taxonomyQuery}`,
        ),
        api<KnowledgeFolder[]>(`/knowledge/taxonomy/folders${taxonomyQuery}`),
      ]),
    );
    if (result) {
      setKnowledgeSources(result[0].data);
      setKnowledgePageInfo(result[0].pageInfo);
      setKnowledgeCategories(result[1]);
      setKnowledgeFolders(result[2]);
    }
  }

  async function refreshKnowledgeSourcesSilently() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const sourceParams = new URLSearchParams();
    if (organizationId) sourceParams.set("organizationId", organizationId);
    sourceParams.set("page", String(knowledgeQuery.page ?? 1));
    sourceParams.set("limit", String(knowledgeQuery.limit ?? 25));
    if (knowledgeQuery.search)
      sourceParams.set("search", knowledgeQuery.search);
    if (knowledgeQuery.status)
      sourceParams.set("status", knowledgeQuery.status);
    if (knowledgeQuery.type) sourceParams.set("type", knowledgeQuery.type);
    if (knowledgeQuery.folderId)
      sourceParams.set("folderId", knowledgeQuery.folderId);
    if (knowledgeQuery.quarantined !== undefined)
      sourceParams.set("quarantined", String(knowledgeQuery.quarantined));
    try {
      const result = await api<KnowledgeSourceList>(
        `/knowledge/sources?${sourceParams.toString()}`,
      );
      setKnowledgeSources(result.data);
      setKnowledgePageInfo(result.pageInfo);
    } catch {
      // The next explicit refresh surfaces the API error without interrupting the workspace.
    }
  }

  async function loadAuditLogs() {
    const result = await run(() =>
      api<{ data: AuditLog[] }>("/audit-logs?limit=20"),
    );
    if (result) setAuditLogs(result.data);
  }

  async function loadAppointmentServices() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      api<AppointmentService[]>(`/appointment-booking/services${query}`),
    );
    if (result) setAppointmentServices(result);
  }

  async function loadAppointmentStaff() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      api<AppointmentStaff[]>(`/appointment-booking/staff${query}`),
    );
    if (result) setAppointmentStaff(result);
  }

  async function loadAppointmentResources() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      api<AppointmentResource[]>(`/appointment-booking/resources${query}`),
    );
    if (result) setAppointmentResources(result);
  }

  async function loadAppointmentBookings() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams({ limit: "30" });
    if (organizationId) params.set("organizationId", organizationId);
    const result = await run(() =>
      api<AppointmentBookingList>(`/appointment-booking/bookings?${params}`),
    );
    if (result) setAppointmentBookings(result.data);
  }

  async function loadAppointmentCalendarConnections() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    const result = await run(() =>
      api<AppointmentCalendarConnection[]>(
        `/appointment-booking/calendars/connections?${params}`,
      ),
    );
    if (result) setAppointmentCalendarConnections(result);
  }

  async function loadAppointmentOperations() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    const query = params.size ? `?${params}` : "";
    const canConfigure = user?.roles.some((role) =>
      ["super_admin", "org_admin", "product_admin"].includes(role),
    );
    const [policy, blackouts, waitlist] = await Promise.all([
      canConfigure
        ? run(() =>
            api<AppointmentPolicy>(`/appointment-booking/policy${query}`),
          )
        : Promise.resolve(null),
      run(() =>
        api<AppointmentBlackout[]>(`/appointment-booking/blackouts${query}`),
      ),
      run(() =>
        api<AppointmentWaitlistEntry[]>(
          `/appointment-booking/waitlist${query}`,
        ),
      ),
    ]);
    if (policy) setAppointmentPolicy(policy);
    if (blackouts) setAppointmentBlackouts(blackouts);
    if (waitlist) setAppointmentWaitlist(waitlist);
  }

  async function loadWhatsAppConfigs() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      api<WhatsAppConfig[]>(`/whatsapp-assistant/configs${query}`),
    );
    if (result) {
      setWhatsAppConfigs(result);
      const configId =
        result.find((config) => config.id === selectedWhatsAppConfigId)?.id ??
        result[0]?.id ??
        null;
      setSelectedWhatsAppConfigId(configId);
      if (configId) await loadWhatsAppTemplates(configId, true);
      else setWhatsAppTemplates([]);
    }
  }

  async function loadWhatsAppTemplates(configId: string, silent = false) {
    const request = () =>
      api<WhatsAppTemplate[]>(
        `/whatsapp-assistant/configs/${configId}/templates`,
      );
    const result = silent
      ? await request().catch(() => null)
      : await run(request);
    if (result) setWhatsAppTemplates(result);
    return result;
  }

  async function selectWhatsAppConfig(configId: string) {
    setSelectedWhatsAppConfigId(configId);
    await loadWhatsAppTemplates(configId);
  }

  async function loadWhatsAppConversations(
    overrides?: Partial<typeof whatsAppFilters>,
    silent = false,
  ) {
    const nextFilters = { ...whatsAppFilters, ...overrides };
    if (overrides) setWhatsAppFilters(nextFilters);
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams({
      page: String(nextFilters.page),
      limit: String(nextFilters.limit),
      ...(organizationId ? { organizationId } : {}),
      ...(nextFilters.status ? { status: nextFilters.status } : {}),
      ...(nextFilters.search ? { search: nextFilters.search } : {}),
    });
    const request = () =>
      api<WhatsAppConversationList>(
        `/whatsapp-assistant/conversations?${params}`,
      );
    const result = silent
      ? await request().catch(() => null)
      : await run(request);

    if (result) {
      setWhatsAppConversations(result);
      const nextSelected = selectedWhatsAppConversation
        ? (result.data.find(
            (item) => item.id === selectedWhatsAppConversation.id,
          ) ?? selectedWhatsAppConversation)
        : (result.data[0] ?? null);
      setSelectedWhatsAppConversation(nextSelected);
      if (nextSelected && nextSelected.configId !== selectedWhatsAppConfigId) {
        setSelectedWhatsAppConfigId(nextSelected.configId);
        await loadWhatsAppTemplates(nextSelected.configId, true);
      }
    }
  }

  async function loadWhatsAppConversation(id: string, silent = false) {
    const request = () =>
      api<WhatsAppConversation>(`/whatsapp-assistant/conversations/${id}`);
    const result = silent
      ? await request().catch(() => null)
      : await run(request);
    if (result) {
      setSelectedWhatsAppConversation(result);
      if (result.configId !== selectedWhatsAppConfigId) {
        setSelectedWhatsAppConfigId(result.configId);
        await loadWhatsAppTemplates(result.configId, true);
      }
    }
  }

  async function loadVoiceConfigs() {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() =>
      api<VoiceConfig[]>(`/voice-receptionist/configs${query}`),
    );
    if (result) setVoiceConfigs(result);
  }

  async function loadVoiceCalls(
    nextFilters?: VoiceCallFilters,
    silent = false,
  ) {
    const effectiveFilters = nextFilters ?? voiceFilters;
    if (nextFilters) setVoiceFilters(nextFilters);
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams({
      page: String(effectiveFilters.page),
      limit: String(effectiveFilters.limit),
      ...(organizationId ? { organizationId } : {}),
      ...(effectiveFilters.status ? { status: effectiveFilters.status } : {}),
      ...(effectiveFilters.search ? { search: effectiveFilters.search } : {}),
    });
    const task = () =>
      api<VoiceCallList>(`/voice-receptionist/calls?${params}`);
    let result: VoiceCallList | null = null;
    if (silent) {
      try {
        result = await task();
      } catch {
        return;
      }
    } else {
      result = await run(task);
    }

    if (result) {
      setVoiceCalls(result);
      setSelectedVoiceCall((current) =>
        current
          ? (result.data.find((item) => item.id === current.id) ?? current)
          : (result.data[0] ?? null),
      );
    }
  }

  async function loadVoiceCall(id: string, silent = false) {
    const task = () => api<VoiceCall>(`/voice-receptionist/calls/${id}`);
    let result: VoiceCall | null = null;
    if (silent) {
      try {
        result = await task();
      } catch {
        return;
      }
    } else {
      result = await run(task);
    }
    if (result) setSelectedVoiceCall(result);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result = await run(
      () =>
        api<AuthResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      "Signed in",
    );

    if (result) {
      persistSession(result);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() =>
      publicApi<PasswordResetRequestResponse>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: String(form.get("email")) }),
      }),
    );

    if (result) {
      setState({
        loading: false,
        error: null,
        message: result.devResetToken
          ? `Reset token: ${result.devResetToken}`
          : "Password reset requested",
      });
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        publicApi<{ reset: boolean }>("/auth/password-reset/confirm", {
          method: "POST",
          body: JSON.stringify({
            token: String(form.get("token")).trim(),
            password: String(form.get("password")),
          }),
        }),
      "Password reset. You can sign in now.",
    );

    if (result) formElement.reset();
  }

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(
      () =>
        publicApi<AuthResponse>("/auth/invites/accept", {
          method: "POST",
          body: JSON.stringify({
            token: String(form.get("token")).trim(),
            name: String(form.get("name")),
            password: String(form.get("password")),
          }),
        }),
      "Invite accepted",
    );

    if (result) {
      persistSession(result);
    }
  }

  async function handleLogout() {
    const storedRefreshToken =
      refreshToken ?? window.localStorage.getItem("agentcore_refresh_token");
    if (storedRefreshToken && token) {
      await run(() =>
        api<{ loggedOut: boolean }>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        }),
      );
    }
    clearSession();
  }

  function persistSession(auth: AuthResponse) {
    setSelectedOrganizationId(null);
    setOrganization(null);
    setOrganizations([]);
    setToken(auth.accessToken);
    setRefreshToken(auth.refreshToken);
    setUser(auth.user);
    window.localStorage.setItem("agentcore_token", auth.accessToken);
    window.localStorage.setItem("agentcore_refresh_token", auth.refreshToken);
    window.localStorage.setItem("agentcore_user", JSON.stringify(auth.user));
  }

  function clearSession() {
    window.localStorage.removeItem("agentcore_token");
    window.localStorage.removeItem("agentcore_refresh_token");
    window.localStorage.removeItem("agentcore_user");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setSelectedOrganizationId(null);
    setOrganization(null);
    setOrganizations([]);
    setSelectedConversation(null);
    setSelectedWhatsAppConversation(null);
    setSelectedVoiceCall(null);
  }

  async function sendAgentReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("reply"));
    const result = await run(
      () =>
        api<{ conversation: Conversation }>(
          `/customer-chat/conversations/${selectedConversation.id}/agent-messages`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        ),
      "Reply sent",
    );

    if (result) {
      formElement.reset();
      setSelectedConversation(result.conversation);
      await loadConversations();
    }
  }

  async function updateConversationStatus(status: Conversation["status"]) {
    if (!selectedConversation) return;

    const result = await run(
      () =>
        api<Conversation>(
          `/customer-chat/conversations/${selectedConversation.id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status,
              expectedVersion: selectedConversation.version,
            }),
          },
        ),
      "Status updated",
    );

    if (result) {
      setSelectedConversation(result);
      await loadConversations();
    }
  }

  async function createKnowledgeSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<KnowledgeSource>("/knowledge/sources", {
          method: "POST",
          body: JSON.stringify({
            type: "text",
            organizationId: selectedOrganizationId ?? undefined,
            name: String(form.get("name")),
            rawText: String(form.get("rawText")),
            sensitivityLevel: parseOptionalLevel(form),
            productVisibility: form.getAll("productVisibility"),
            categories: parseCategories(form),
            folderId: String(form.get("folderId") || "") || undefined,
          }),
        }),
      "Knowledge source created",
    );

    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
  }

  async function createWebsiteKnowledgeSource(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<KnowledgeSource>("/knowledge/sources", {
          method: "POST",
          body: JSON.stringify({
            type: "website_url",
            organizationId: selectedOrganizationId ?? undefined,
            name: String(form.get("name")),
            url: String(form.get("url")),
            sensitivityLevel: parseOptionalLevel(form),
            productVisibility: form.getAll("productVisibility"),
            categories: parseCategories(form),
            folderId: String(form.get("folderId") || "") || undefined,
            recrawlIntervalHours: Number(
              form.get("recrawlIntervalHours") || 24,
            ),
          }),
        }),
      "Website source created",
    );

    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
  }

  async function uploadKnowledgeFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (selectedOrganizationId)
      form.set("organizationId", selectedOrganizationId);
    if (!form.get("sensitivityLevel")) form.delete("sensitivityLevel");
    if (!form.get("folderId")) form.delete("folderId");
    if (!form.get("categories")) form.delete("categories");
    const file = form.get("file");
    const useDirectUpload =
      file instanceof File && file.size > 20 * 1024 * 1024;
    const result = await run(
      () =>
        useDirectUpload
          ? uploadKnowledgeFileDirect(form, file)
          : uploadApi<KnowledgeSource>("/knowledge/sources/upload", form),
      "File uploaded",
    );

    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
  }

  async function uploadKnowledgeFileDirect(form: FormData, file: File) {
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const upload = await api<{
      uploadUrl: string;
      key: string;
      requiredHeaders: Record<string, string>;
    }>("/knowledge/sources/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        organizationId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });
    await axios.put(upload.uploadUrl, file, {
      headers: upload.requiredHeaders,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return api<KnowledgeSource>("/knowledge/sources/uploads/complete", {
      method: "POST",
      body: JSON.stringify({
        organizationId,
        name: String(form.get("name") ?? ""),
        key: upload.key,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        folderId: String(form.get("folderId") ?? "") || undefined,
        categories: parseCategories(form),
      }),
    });
  }

  function parseOptionalLevel(form: FormData) {
    const value = String(form.get("sensitivityLevel") ?? "");
    return value === "" ? undefined : Number(value);
  }

  function parseCategories(form: FormData) {
    return String(form.get("categories") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  async function createKnowledgeCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<KnowledgeCategory>("/knowledge/taxonomy/categories", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            organizationId: selectedOrganizationId ?? undefined,
          }),
        }),
      "Category created",
    );
    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
  }

  async function createKnowledgeFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<KnowledgeFolder>("/knowledge/taxonomy/folders", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            parentId: String(form.get("parentId") || "") || undefined,
            organizationId: selectedOrganizationId ?? undefined,
          }),
        }),
      "Folder created",
    );
    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
  }

  async function ingestKnowledgeSource(id: string) {
    await run(
      () =>
        api<KnowledgeSource>(`/knowledge/sources/${id}/ingest`, {
          method: "POST",
        }),
      "Ingestion started",
    );
    await loadKnowledgeSources();
  }

  async function cancelKnowledgeIngestion(id: string) {
    const result = await run(
      () =>
        api(`/knowledge/sources/${id}/ingestion/cancel`, { method: "POST" }),
      "Ingestion cancellation requested",
    );
    if (result) await loadKnowledgeSources();
  }

  async function releaseKnowledgeQuarantine(id: string) {
    await run(
      () =>
        api<KnowledgeSource>(`/knowledge/sources/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ isQuarantined: false }),
        }),
      "Knowledge source approved",
    );
    await loadKnowledgeSources();
  }

  async function deleteKnowledgeSource(id: string) {
    const result = await run(
      () =>
        api<{ deleted: boolean }>(`/knowledge/sources/${id}`, {
          method: "DELETE",
        }),
      "Knowledge source deleted",
    );
    if (result) await loadKnowledgeSources();
  }

  async function updateKnowledgeSource(
    id: string,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recrawlValue = String(form.get("recrawlIntervalHours") ?? "");
    const result = await run(
      () =>
        api<KnowledgeSource>(`/knowledge/sources/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: String(form.get("name")),
            url: String(form.get("url") || "") || undefined,
            sensitivityLevel: Number(form.get("sensitivityLevel") ?? 0),
            productVisibility: form.getAll("productVisibility"),
            categories: parseCategories(form),
            folderId: String(form.get("folderId") || "") || null,
            recrawlIntervalHours: recrawlValue ? Number(recrawlValue) : null,
          }),
        }),
      "Knowledge source updated",
    );
    if (result) await loadKnowledgeSources();
  }

  async function updateKnowledgeCategory(id: string, name: string) {
    const result = await run(
      () =>
        api<KnowledgeCategory>(`/knowledge/taxonomy/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }),
      "Category updated",
    );
    if (result) await loadKnowledgeSources();
  }

  async function deleteKnowledgeCategory(id: string) {
    const result = await run(
      () =>
        api<{ deleted: boolean }>(`/knowledge/taxonomy/categories/${id}`, {
          method: "DELETE",
        }),
      "Category deleted",
    );
    if (result) await loadKnowledgeSources();
  }

  async function updateKnowledgeFolder(id: string, name: string) {
    const result = await run(
      () =>
        api<KnowledgeFolder>(`/knowledge/taxonomy/folders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }),
      "Folder updated",
    );
    if (result) await loadKnowledgeSources();
  }

  async function deleteKnowledgeFolder(id: string) {
    const result = await run(
      () =>
        api<{ deleted: boolean }>(`/knowledge/taxonomy/folders/${id}`, {
          method: "DELETE",
        }),
      "Folder deleted",
    );
    if (result) await loadKnowledgeSources();
  }

  async function loadKnowledgeVersions(id: string) {
    return (
      (await run(() =>
        api<KnowledgeSourceVersion[]>(`/knowledge/sources/${id}/versions`),
      )) ?? []
    );
  }

  async function saveKnowledgeExtractionSettings(
    input: KnowledgeExtractionSettingsInput,
  ) {
    const result = await run(
      () =>
        api<KnowledgeExtractionSettings>("/knowledge/settings/extraction", {
          method: "PATCH",
          body: JSON.stringify({
            ...input,
            organizationId: selectedOrganizationId ?? user?.orgId,
          }),
        }),
      "Knowledge processing policy saved",
    );
    if (!result) return false;
    setKnowledgeExtractionSettings(result);
    await loadKnowledgeSources();
    return true;
  }

  async function saveKnowledgeOcrProvider(
    input: KnowledgeOcrProviderInput,
    id?: string,
  ) {
    const result = await run(
      () =>
        api<KnowledgeOcrProvider>(
          id
            ? `/knowledge/settings/ocr-providers/${id}`
            : "/knowledge/settings/ocr-providers",
          {
            method: id ? "PATCH" : "POST",
            body: JSON.stringify({
              ...input,
              organizationId: selectedOrganizationId ?? user?.orgId,
            }),
          },
        ),
      id ? "OCR provider updated" : "OCR provider created",
    );
    if (!result) return false;
    await loadKnowledgeSettings();
    return true;
  }

  async function deleteKnowledgeOcrProvider(id: string) {
    const result = await run(
      () =>
        api<{ deleted: boolean }>(`/knowledge/settings/ocr-providers/${id}`, {
          method: "DELETE",
        }),
      "OCR provider deleted",
    );
    if (!result) return false;
    await loadKnowledgeSettings();
    return true;
  }

  async function updateWidgetConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!widgetConfig) return;
    const form = new FormData(event.currentTarget);
    const result = await run(
      () =>
        api<WidgetConfig>(`/customer-chat/widget-configs/${widgetConfig.id}`, {
          method: "PATCH",
          body: JSON.stringify(widgetPayloadFromForm(form)),
        }),
      "Widget saved",
    );

    if (result) {
      setWidgetConfig(result);
      setWidgetConfigs((current) =>
        current.map((widget) => (widget.id === result.id ? result : widget)),
      );
    }
  }

  async function createWidgetConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(
      () =>
        api<WidgetConfig>("/customer-chat/widget-configs", {
          method: "POST",
          body: JSON.stringify({
            ...widgetPayloadFromForm(form),
            organizationId: selectedOrganizationId ?? user?.orgId,
          }),
        }),
      "Widget created",
    );
    if (result) {
      await loadWidgetConfig(1);
      setWidgetConfig(result);
      setWidgetTestConversation(null);
      setWidgetVisitorToken(null);
    }
  }

  async function deleteWidgetConfig(configToDelete: WidgetConfig) {
    const deletedId = configToDelete.id;
    const result = await run(
      () =>
        api<{ deleted: boolean }>(
          `/customer-chat/widget-configs/${deletedId}`,
          {
            method: "DELETE",
          },
        ),
      "Widget deleted",
    );
    if (result) {
      const remainingTotal = Math.max(0, widgetPageInfo.total - 1);
      const remainingPages = Math.max(
        1,
        Math.ceil(remainingTotal / widgetPageInfo.limit),
      );
      setWidgetConfigs((current) =>
        current.filter((widget) => widget.id !== deletedId),
      );
      setWidgetPageInfo((current) => ({
        ...current,
        total: remainingTotal,
        totalPages: remainingPages,
      }));
      if (widgetConfig?.id === deletedId) {
        setWidgetConfig(null);
        setWidgetTestConversation(null);
        setWidgetVisitorToken(null);
      }
      await loadWidgetConfig(Math.min(widgetPageInfo.page, remainingPages));
    }
  }

  function widgetPayloadFromForm(form: FormData) {
    const knowledgeScope = String(form.get("knowledgeScope")) as
      "all" | "folders";
    return {
      name: String(form.get("name")),
      enabled: form.get("enabled") === "on",
      knowledgeScope,
      folderIds:
        knowledgeScope === "folders"
          ? form.getAll("folderIds").map(String)
          : [],
      greetingText: String(form.get("greetingText")),
      allowedDomains: [
        ...new Set(
          form
            .getAll("allowedDomains")
            .map(String)
            .map((domain) => domain.trim())
            .filter(Boolean),
        ),
      ],
      settings: {
        assistantName: String(form.get("assistantName")),
        primaryColor: String(form.get("primaryColor")),
        launcherLabel: String(form.get("launcherLabel")),
        position: String(form.get("position")),
      },
    };
  }

  async function sendWidgetTestMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!widgetConfig?.widgetKey) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("message")).trim();

    if (!content) return;

    const result = await run(async () => {
      let conversation = widgetTestConversation;
      let visitorToken = widgetVisitorToken;

      if (!conversation || !visitorToken) {
        const created = await publicApi<PublicWidgetConversationCreated>(
          `/customer-chat/widget/${widgetConfig.widgetKey}/conversations`,
          {
            method: "POST",
            body: JSON.stringify({
              visitorName: "Test Visitor",
              visitorId: "console-test-visitor",
              metadata: { source: "console_widget_test" },
            }),
          },
        );

        conversation = created.conversation;
        visitorToken = created.visitorToken;
        setWidgetVisitorToken(visitorToken);
      }

      const sent = await publicApi<CustomerChatSendMessageResponse>(
        `/customer-chat/widget/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "x-visitor-token": visitorToken },
          body: JSON.stringify({ content }),
        },
      );

      return sent.conversation;
    }, "Widget test message sent");

    if (result) {
      formElement.reset();
      setWidgetTestConversation(result);
      setSelectedConversation(result);
      setConversations((current) => {
        const existing = current?.data ?? [];
        const data = [
          result,
          ...existing.filter((conversation) => conversation.id !== result.id),
        ];

        return {
          data,
          total: Math.max(current?.total ?? 0, data.length),
          page: current?.page ?? 1,
          limit: current?.limit ?? 30,
        };
      });
      setFilters({ status: "", search: "" });
    }
  }

  function productAccessFromForm(form: FormData) {
    const role = String(form.get("role"));
    return (form.getAll("productKeys") as ProductKey[]).map((productKey) => ({
      productKey,
      canUse: true,
      canConfigure: role === "product_admin",
      canManageAgents: role === "product_admin",
    }));
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<Organization>("/organizations", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            contactEmail: String(form.get("contactEmail")) || undefined,
            contactPhone: String(form.get("contactPhone")) || undefined,
            plan: String(form.get("plan")),
            deploymentMode: String(form.get("deploymentMode")),
            firstAdmin: {
              name: String(form.get("adminName")),
              email: String(form.get("adminEmail")),
              password: String(form.get("adminPassword")),
            },
            enabledProducts: form.getAll("products"),
          }),
        }),
      "Organization and first admin created",
    );
    if (result) {
      formElement.reset();
      await Promise.all([loadOrganizations(), loadUsers()]);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<User>("/users", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            email: String(form.get("email")),
            password: String(form.get("password")),
            roles: [String(form.get("role"))],
            orgId: String(form.get("orgId")) || undefined,
            clearanceLevel: Number(form.get("clearanceLevel") || 0),
            productAccess: productAccessFromForm(form),
          }),
        }),
      "User created",
    );

    if (result) {
      formElement.reset();
      await loadUsers();
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name")).trim();
    const result = await run(() =>
      api<InviteResponse>("/auth/invites", {
        method: "POST",
        body: JSON.stringify({
          name: name || undefined,
          email: String(form.get("email")),
          roles: [String(form.get("role"))],
          orgId: String(form.get("orgId")) || undefined,
          clearanceLevel: Number(form.get("clearanceLevel") || 0),
          productAccess: productAccessFromForm(form),
        }),
      }),
    );

    if (result) {
      formElement.reset();
      await loadUsers();
      setState({
        loading: false,
        error: null,
        message: result.devInviteToken
          ? `Invite token: ${result.devInviteToken}`
          : `Invite created for ${result.email}`,
      });
    }
  }

  async function toggleUserStatus(target: User) {
    await run(
      () =>
        api<User>(`/users/${target.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: target.isActive === false ? "active" : "inactive",
          }),
        }),
      "User status updated",
    );
    await loadUsers();
  }

  async function updateUserAccess(
    target: User,
    role: string,
    productKeys: ProductKey[],
    clearanceLevel: number,
  ) {
    const result = await run(
      () =>
        api<User>(`/users/${target.id}/roles`, {
          method: "PATCH",
          body: JSON.stringify({
            roles: [role],
            clearanceLevel,
            productAccess: productKeys.map((productKey) => ({
              productKey,
              canUse: true,
              canConfigure: role === "product_admin",
              canManageAgents: role === "product_admin",
            })),
          }),
        }),
      "User access updated",
    );
    if (result) await loadUsers();
  }

  async function updateProductStatus(
    productKey: string,
    status: "enabled" | "disabled",
  ) {
    const path =
      user?.roles.includes("super_admin") && selectedOrganizationId
        ? `/organizations/${selectedOrganizationId}/products/${productKey}`
        : `/organizations/me/products/${productKey}`;
    await run(
      () =>
        api<ProductEntitlement>(path, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      "Product updated",
    );
    await loadProducts();
  }

  async function createAIProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const adapter = String(form.get("adapter") || "");
    await run(
      () =>
        api<AIProvider>("/ai/providers", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            provider: String(form.get("provider")),
            name: String(form.get("name")),
            baseUrl: String(form.get("baseUrl")) || undefined,
            apiKey: String(form.get("apiKey")) || undefined,
            chatModel: String(form.get("chatModel")) || undefined,
            embeddingModel: String(form.get("embeddingModel")) || undefined,
            settings: adapter ? { adapter } : undefined,
          }),
        }),
      "AI provider saved",
    );
    await loadAIProviders();
  }

  async function createAppointmentService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<AppointmentService>("/appointment-booking/services", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            name: String(form.get("name")),
            description: String(form.get("description")) || undefined,
            durationMinutes: Number(form.get("durationMinutes")),
            bufferBeforeMinutes: Number(form.get("bufferBeforeMinutes") || 0),
            bufferAfterMinutes: Number(form.get("bufferAfterMinutes") || 0),
            maxAttendees: Number(form.get("maxAttendees") || 1),
            cancellationWindowMinutes: form.get("cancellationWindowMinutes")
              ? Number(form.get("cancellationWindowMinutes"))
              : undefined,
            rescheduleWindowMinutes: form.get("rescheduleWindowMinutes")
              ? Number(form.get("rescheduleWindowMinutes"))
              : undefined,
            waitlistEnabled: form.get("waitlistEnabled") === "on",
          }),
        }),
      "Appointment service created",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentServices();
    }
  }

  async function updateAppointmentService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const serviceId = String(form.get("serviceId"));
    const result = await run(
      () =>
        api<AppointmentService>(`/appointment-booking/services/${serviceId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: String(form.get("name")),
            description: String(form.get("description")) || null,
            durationMinutes: Number(form.get("durationMinutes")),
            bufferBeforeMinutes: Number(form.get("bufferBeforeMinutes") || 0),
            bufferAfterMinutes: Number(form.get("bufferAfterMinutes") || 0),
            maxAttendees: Number(form.get("maxAttendees") || 1),
            cancellationWindowMinutes: form.get("cancellationWindowMinutes")
              ? Number(form.get("cancellationWindowMinutes"))
              : null,
            rescheduleWindowMinutes: form.get("rescheduleWindowMinutes")
              ? Number(form.get("rescheduleWindowMinutes"))
              : null,
            waitlistEnabled: form.get("waitlistEnabled") === "on",
          }),
        }),
      "Appointment service updated",
    );
    if (result) await loadAppointmentServices();
  }

  async function createAppointmentStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const serviceId = String(form.get("serviceId"));
    const result = await run(
      () =>
        api<AppointmentStaff>("/appointment-booking/staff", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            name: String(form.get("name")),
            email: String(form.get("email")) || undefined,
            timezone: String(form.get("timezone")) || "UTC",
            serviceIds: serviceId ? [serviceId] : undefined,
          }),
        }),
      "Appointment staff created",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentStaff();
    }
  }

  async function createAppointmentResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const serviceId = String(form.get("serviceId") || "");
    const result = await run(
      () =>
        api<AppointmentResource>("/appointment-booking/resources", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            name: String(form.get("name")),
            type: String(form.get("type")) || "generic",
            capacity: Number(form.get("capacity") || 1),
          }),
        }),
      "Resource created",
    );
    if (result && serviceId) {
      await run(
        () =>
          api(`/appointment-booking/services/${serviceId}/resources`, {
            method: "POST",
            body: JSON.stringify({ resourceId: result.id, quantity: 1 }),
          }),
        "Resource created and assigned",
      );
    }
    if (result) {
      formElement.reset();
      await loadAppointmentResources();
    }
  }

  async function createStaffAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const staffId = String(form.get("staffId"));
    const result = await run(
      () =>
        api(`/appointment-booking/staff/${staffId}/availability`, {
          method: "POST",
          body: JSON.stringify({
            dayOfWeek: Number(form.get("dayOfWeek")),
            startTime: String(form.get("startTime")),
            endTime: String(form.get("endTime")),
            isActive: true,
          }),
        }),
      "Availability added",
    );

    if (result) formElement.reset();
  }

  async function createStaffTimeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const staffId = String(form.get("staffId"));
    const result = await run(
      () =>
        api(`/appointment-booking/staff/${staffId}/time-off`, {
          method: "POST",
          body: JSON.stringify({
            startAt: toIsoDateTime(form.get("startAt")),
            endAt: toIsoDateTime(form.get("endAt")),
            reason: String(form.get("reason")) || undefined,
          }),
        }),
      "Time off added",
    );

    if (result) formElement.reset();
  }

  async function searchAppointmentSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      serviceId: String(form.get("serviceId")),
      date: String(form.get("date")),
    });
    const organizationId = selectedOrganizationId ?? user?.orgId;
    if (organizationId) params.set("organizationId", organizationId);
    const result = await run(
      () =>
        api<AppointmentSlot[]>(`/appointment-booking/availability?${params}`),
      "Slots loaded",
    );

    if (result) setAppointmentSlots(result);
  }

  async function createAppointmentBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const staffId = String(form.get("staffId"));
    const recurrenceFrequency = String(form.get("recurrenceFrequency") || "");
    const result = await run(
      () =>
        api<AppointmentBooking>("/appointment-booking/bookings", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            serviceId: String(form.get("serviceId")),
            staffId: staffId || undefined,
            customerName: String(form.get("customerName")),
            customerEmail: String(form.get("customerEmail")) || undefined,
            customerPhone: String(form.get("customerPhone")) || undefined,
            partySize: Number(form.get("partySize") || 1),
            startAt: toIsoDateTime(form.get("startAt")),
            notes: String(form.get("notes")) || undefined,
            recurrence: recurrenceFrequency
              ? {
                  frequency: recurrenceFrequency,
                  interval: Number(form.get("recurrenceInterval") || 1),
                  count: Number(form.get("recurrenceCount") || 2),
                }
              : undefined,
          }),
        }),
      "Booking created",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentBookings();
    }
  }

  async function rescheduleAppointmentBooking(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const bookingId = String(form.get("bookingId"));
    const staffId = String(form.get("staffId"));
    const result = await run(
      () =>
        api<AppointmentBooking>(
          `/appointment-booking/bookings/${bookingId}/reschedule`,
          {
            method: "PATCH",
            body: JSON.stringify({
              staffId: staffId || undefined,
              startAt: toIsoDateTime(form.get("startAt")),
              applyToFuture: form.get("applyToFuture") === "on",
            }),
          },
        ),
      "Booking rescheduled",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentBookings();
    }
  }

  async function cancelAppointmentBooking(id: string) {
    await run(
      () =>
        api<AppointmentBooking>(`/appointment-booking/bookings/${id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason: "Cancelled from console" }),
        }),
      "Booking cancelled",
    );
    await loadAppointmentBookings();
  }

  async function checkInAppointmentBooking(id: string) {
    const result = await run(
      () =>
        api<AppointmentBooking>(
          `/appointment-booking/bookings/${id}/check-in`,
          {
            method: "PATCH",
            body: JSON.stringify({}),
          },
        ),
      "Customer checked in",
    );
    if (result) await loadAppointmentBookings();
  }

  async function cancelAppointmentSeries(
    seriesId: string,
    fromOccurrenceIndex?: number,
  ) {
    const result = await run(
      () =>
        api<{ cancelled: number }>(
          `/appointment-booking/series/${seriesId}/cancel`,
          {
            method: "PATCH",
            body: JSON.stringify({
              fromOccurrenceIndex,
              reason: "Cancelled from console",
            }),
          },
        ),
      "Recurring appointments cancelled",
    );
    if (result) await loadAppointmentBookings();
  }

  async function updateAppointmentPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const organizationId = selectedOrganizationId ?? user?.orgId;
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    const result = await run(
      () =>
        api<AppointmentPolicy>(`/appointment-booking/policy?${params}`, {
          method: "PATCH",
          body: JSON.stringify({
            cancellationWindowMinutes: Number(
              form.get("cancellationWindowMinutes"),
            ),
            rescheduleWindowMinutes: Number(
              form.get("rescheduleWindowMinutes"),
            ),
            noShowGraceMinutes: Number(form.get("noShowGraceMinutes")),
            waitlistOfferMinutes: Number(form.get("waitlistOfferMinutes")),
            quietHoursEnabled: form.get("quietHoursEnabled") === "on",
            quietHoursStart: String(form.get("quietHoursStart")),
            quietHoursEnd: String(form.get("quietHoursEnd")),
            quietHoursTimezone: String(form.get("quietHoursTimezone")),
          }),
        }),
      "Booking policy updated",
    );
    if (result) setAppointmentPolicy(result);
  }

  async function createAppointmentBlackout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<AppointmentBlackout>("/appointment-booking/blackouts", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            name: String(form.get("name")),
            startAt: toIsoDateTime(form.get("startAt")),
            endAt: toIsoDateTime(form.get("endAt")),
            annual: form.get("annual") === "on",
          }),
        }),
      "Blackout added",
    );
    if (result) {
      formElement.reset();
      await loadAppointmentOperations();
    }
  }

  async function deleteAppointmentBlackout(id: string) {
    const result = await run(
      () =>
        api<{ deleted: boolean }>(`/appointment-booking/blackouts/${id}`, {
          method: "DELETE",
        }),
      "Blackout removed",
    );
    if (result) await loadAppointmentOperations();
  }

  async function connectAppointmentCalendar(
    provider: "google" | "microsoft",
    staffId: string,
  ) {
    const result = await run(
      () =>
        api<{ authorizationUrl: string }>(
          "/appointment-booking/calendars/connections",
          {
            method: "POST",
            body: JSON.stringify({ provider, staffId }),
          },
        ),
      `Opening ${provider === "google" ? "Google" : "Microsoft"} authorization`,
    );
    if (result?.authorizationUrl)
      window.location.assign(result.authorizationUrl);
  }

  async function disconnectAppointmentCalendar(id: string) {
    const result = await run(
      () =>
        api<{ disconnected: boolean }>(
          `/appointment-booking/calendars/connections/${id}`,
          { method: "DELETE" },
        ),
      "Calendar disconnected",
    );
    if (result) await loadAppointmentCalendarConnections();
  }

  async function createWhatsAppConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<WhatsAppConfig>("/whatsapp-assistant/configs", {
          method: "POST",
          body: JSON.stringify({
            organizationId: selectedOrganizationId ?? user?.orgId,
            name: String(form.get("name")),
            provider: String(form.get("provider")),
            phoneNumberId: String(form.get("phoneNumberId")) || undefined,
            businessAccountId:
              String(form.get("businessAccountId")) || undefined,
            accessToken:
              form.get("clearAccessToken") === "on"
                ? null
                : String(form.get("accessToken")) || undefined,
            webhookVerifyToken:
              form.get("clearWebhookVerifyToken") === "on"
                ? null
                : String(form.get("webhookVerifyToken")) || undefined,
            appSecret:
              form.get("clearAppSecret") === "on"
                ? null
                : String(form.get("appSecret")) || undefined,
            defaultLocale: String(form.get("defaultLocale")) || "en",
            status: String(form.get("status") || "active"),
            settings: {
              handoffKeywords: String(form.get("handoffKeywords") || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            },
          }),
        }),
      "WhatsApp config saved",
    );

    if (result) {
      formElement.reset();
      await loadWhatsAppConfigs();
    }
  }

  async function updateWhatsAppConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const configId = String(form.get("configId"));
    const existing = whatsAppConfigs.find((config) => config.id === configId);
    if (!existing) return;
    const result = await run(
      () =>
        api<WhatsAppConfig>(`/whatsapp-assistant/configs/${configId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: String(form.get("name")),
            provider: String(form.get("provider")),
            status: String(form.get("status")),
            phoneNumberId: String(form.get("phoneNumberId")) || null,
            businessAccountId: String(form.get("businessAccountId")) || null,
            accessToken:
              form.get("clearAccessToken") === "on"
                ? null
                : String(form.get("accessToken")) || undefined,
            webhookVerifyToken:
              form.get("clearWebhookVerifyToken") === "on"
                ? null
                : String(form.get("webhookVerifyToken")) || undefined,
            appSecret:
              form.get("clearAppSecret") === "on"
                ? null
                : String(form.get("appSecret")) || undefined,
            defaultLocale: String(form.get("defaultLocale")) || "en",
            settings: {
              ...existing.settings,
              handoffKeywords: String(form.get("handoffKeywords") || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            },
          }),
        }),
      "WhatsApp config updated",
    );
    if (result) await loadWhatsAppConfigs();
  }

  async function syncWhatsAppTemplates(configId: string) {
    const result = await run(
      () =>
        api<WhatsAppTemplate[]>(
          `/whatsapp-assistant/configs/${configId}/templates/sync`,
          { method: "POST" },
        ),
      "WhatsApp templates synchronized",
    );
    if (result) setWhatsAppTemplates(result);
  }

  async function sendWhatsAppReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWhatsAppConversation) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<{ conversation: WhatsAppConversation }>(
          `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/agent-messages`,
          {
            method: "POST",
            body: JSON.stringify({ content: String(form.get("reply")) }),
          },
        ),
      "WhatsApp reply sent",
    );

    if (result) {
      formElement.reset();
      setSelectedWhatsAppConversation(result.conversation);
      await loadWhatsAppConversations();
    }
  }

  async function sendWhatsAppTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWhatsAppConversation) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(() => {
      const componentsText = String(form.get("components") || "").trim();
      let components: Record<string, unknown>[] | undefined;
      if (componentsText) {
        const parsed: unknown = JSON.parse(componentsText);
        if (!Array.isArray(parsed)) {
          throw new Error("Template components must be a JSON array");
        }
        components = parsed as Record<string, unknown>[];
      }
      return api<{ conversation: WhatsAppConversation }>(
        `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/template-messages`,
        {
          method: "POST",
          body: JSON.stringify({
            templateName: String(form.get("templateName")),
            language: String(form.get("language")) || undefined,
            components,
          }),
        },
      );
    }, "WhatsApp template sent");
    if (result) {
      formElement.reset();
      setSelectedWhatsAppConversation(result.conversation);
      await loadWhatsAppConversations(undefined, true);
    }
  }

  async function sendWhatsAppMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWhatsAppConversation) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<{ conversation: WhatsAppConversation }>(
          `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/media-messages`,
          {
            method: "POST",
            body: JSON.stringify({
              type: String(form.get("type")),
              mediaId: String(form.get("mediaId")) || undefined,
              link: String(form.get("link")) || undefined,
              caption: String(form.get("caption")) || undefined,
              filename: String(form.get("filename")) || undefined,
            }),
          },
        ),
      "WhatsApp media sent",
    );
    if (result) {
      formElement.reset();
      setSelectedWhatsAppConversation(result.conversation);
      await loadWhatsAppConversations(undefined, true);
    }
  }

  async function assignWhatsAppConversation(assignedAgentId: string | null) {
    if (!selectedWhatsAppConversation) return;
    const result = await run(
      () =>
        api<WhatsAppConversation>(
          `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/assignment`,
          {
            method: "PATCH",
            body: JSON.stringify({ assignedAgentId }),
          },
        ),
      assignedAgentId ? "WhatsApp conversation assigned" : "Assignment removed",
    );
    if (result) {
      setSelectedWhatsAppConversation(result);
      await loadWhatsAppConversations(undefined, true);
    }
  }

  async function retryWhatsAppMessage(message: WhatsAppMessage) {
    if (!selectedWhatsAppConversation) return;
    const basePath = `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}`;
    const metadata = message.metadata;
    const request = (() => {
      if (message.type === "template") {
        return {
          path: `${basePath}/template-messages`,
          body: {
            templateName:
              typeof metadata.templateName === "string"
                ? metadata.templateName
                : message.content,
            language:
              typeof metadata.language === "string"
                ? metadata.language
                : undefined,
            components: Array.isArray(metadata.components)
              ? metadata.components
              : undefined,
          },
        };
      }
      if (["image", "audio", "video", "document"].includes(message.type)) {
        return {
          path: `${basePath}/media-messages`,
          body: {
            type: message.type,
            mediaId:
              typeof metadata.providerMediaId === "string"
                ? metadata.providerMediaId
                : undefined,
            link: message.mediaUrl ?? undefined,
            caption: message.content ?? undefined,
            filename:
              typeof metadata.filename === "string"
                ? metadata.filename
                : undefined,
          },
        };
      }
      return {
        path: `${basePath}/agent-messages`,
        body: { content: message.content ?? "" },
      };
    })();
    const result = await run(
      () =>
        api<{ conversation: WhatsAppConversation }>(request.path, {
          method: "POST",
          body: JSON.stringify(request.body),
        }),
      "WhatsApp message retried",
    );
    if (result) {
      setSelectedWhatsAppConversation(result.conversation);
      await loadWhatsAppConversations(undefined, true);
    }
  }

  async function openWhatsAppMedia(
    message: WhatsAppMessage,
    disposition: "open" | "download",
  ) {
    const preview =
      disposition === "open" ? window.open("about:blank", "_blank") : null;
    await run(async () => {
      const request = (accessToken: string | null) =>
        axios.request<Blob>({
          url: `${API_BASE_URL}/whatsapp-assistant/messages/${message.id}/media`,
          method: "GET",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
          responseType: "blob",
          validateStatus: () => true,
        });
      let response = await request(token);
      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) response = await request(refreshed.accessToken);
      }
      if (response.status < 200 || response.status >= 300) {
        preview?.close();
        throw new Error(
          `Unable to retrieve WhatsApp media (${response.status})`,
        );
      }
      const url = URL.createObjectURL(response.data);
      if (disposition === "open") {
        if (preview) preview.location.href = url;
        else window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          typeof message.metadata.mediaFilename === "string"
            ? message.metadata.mediaFilename
            : `whatsapp-${message.id}`;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return true;
    });
  }

  async function requestWhatsAppHandoff() {
    if (!selectedWhatsAppConversation) return;

    const result = await run(
      () =>
        api<WhatsAppConversation>(
          `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/handoff`,
          { method: "PATCH" },
        ),
      "WhatsApp handoff requested",
    );

    if (result) {
      setSelectedWhatsAppConversation(result);
      await loadWhatsAppConversations();
    }
  }

  async function updateWhatsAppStatus(status: WhatsAppConversation["status"]) {
    if (!selectedWhatsAppConversation) return;

    const result = await run(
      () =>
        api<WhatsAppConversation>(
          `/whatsapp-assistant/conversations/${selectedWhatsAppConversation.id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        ),
      "WhatsApp status updated",
    );

    if (result) {
      setSelectedWhatsAppConversation(result);
      await loadWhatsAppConversations();
    }
  }

  async function saveVoiceConfig(
    configId: string | null,
    input: VoiceConfigInput,
  ) {
    const result = await run(
      () =>
        api<VoiceConfig>(
          configId
            ? `/voice-receptionist/configs/${configId}`
            : "/voice-receptionist/configs",
          {
            method: configId ? "PATCH" : "POST",
            body: JSON.stringify({
              ...input,
              ...(!configId
                ? {
                    organizationId: selectedOrganizationId ?? user?.orgId,
                  }
                : {}),
            }),
          },
        ),
      configId ? "Voice config updated" : "Voice config created",
    );

    if (result) {
      await loadVoiceConfigs();
    }
    return result;
  }

  async function sendVoiceMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVoiceCall) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<{ call: VoiceCall }>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/agent-messages`,
          {
            method: "POST",
            body: JSON.stringify({ content: String(form.get("reply")) }),
          },
        ),
      "Voice message queued",
    );

    if (result) {
      formElement.reset();
      setSelectedVoiceCall(result.call);
      await loadVoiceCalls();
    }
  }

  async function requestVoiceHandoff() {
    if (!selectedVoiceCall) return;

    const result = await run(
      () =>
        api<VoiceCall>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/handoff`,
          { method: "PATCH" },
        ),
      "Voice handoff requested",
    );

    if (result) {
      setSelectedVoiceCall(result);
      await loadVoiceCalls();
    }
  }

  async function routeVoiceCall(
    action: "transfer" | "voicemail" | "close",
    options?: { transferTo?: string; reason?: string },
  ) {
    if (!selectedVoiceCall) return;

    const result = await run(
      () =>
        api<{ call: VoiceCall }>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/route`,
          {
            method: "POST",
            body: JSON.stringify({ action, ...options }),
          },
        ),
      "Voice route queued",
    );

    if (result) {
      setSelectedVoiceCall(result.call);
      await loadVoiceCalls();
    }
  }

  async function assignVoiceCall(assignedAgentId: string | null) {
    if (!selectedVoiceCall) return;
    const result = await run(
      () =>
        api<VoiceCall>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/assignment`,
          {
            method: "PATCH",
            body: JSON.stringify({ assignedAgentId }),
          },
        ),
      assignedAgentId ? "Voice call assigned" : "Voice call unassigned",
    );
    if (result) {
      setSelectedVoiceCall(result);
      await loadVoiceCalls();
    }
  }

  async function updateVoiceStatus(status: VoiceCall["status"]) {
    if (!selectedVoiceCall) return;

    const result = await run(
      () =>
        api<VoiceCall>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        ),
      "Voice status updated",
    );

    if (result) {
      setSelectedVoiceCall(result);
      await loadVoiceCalls();
    }
  }

  function toIsoDateTime(value: FormDataEntryValue | null) {
    return new Date(String(value)).toISOString();
  }

  if (!isSessionReady) {
    return (
      <main
        className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
      >
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4 text-sm text-[var(--text-muted)] shadow-sm">
            Restoring session...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-4 md:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-sm font-bold text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]">
                AC
              </div>
              <div>
                <div className="text-base font-semibold tracking-wide text-[var(--text-strong)]">
                  AgentCore
                </div>
                <div className="mt-0.5 text-[11px] uppercase text-[var(--text-soft)]">
                  AI Business Suite
                </div>
              </div>
            </div>
            {health ? <StatusPill status={health.status} /> : null}
          </header>
          <LoginPanel
            onSubmit={handleLogin}
            onRequestPasswordReset={requestPasswordReset}
            onResetPassword={resetPassword}
            onAcceptInvite={acceptInvite}
            state={state}
          />
        </div>
      </main>
    );
  }

  return (
    <main
      className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
    >
      <div className="flex min-h-screen">
        <aside className="hidden h-screen w-[272px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)] text-[var(--text-strong)] lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-[var(--border-subtle)] px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-sm font-bold text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]">
              AC
            </div>
            <div>
              <div className="text-base font-semibold tracking-wide">
                AgentCore
              </div>
              <div className="mt-0.5 text-[11px] uppercase text-[var(--text-soft)]">
                AI Business Suite
              </div>
            </div>
          </div>
          <div className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Workspace
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
            {visibleNavItems.map((item) => {
              const Icon = navMeta[item.id].icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition ${
                    activeTab === item.id
                      ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-xl ${activeTab === item.id ? "bg-white/15 text-[var(--text-on-accent)]" : "bg-[var(--surface-tint)] text-[var(--accent-primary)]"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {activeTab === item.id ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)]" />
                  ) : null}
                </button>
              );
            })}
          </nav>
          {user ? (
            <div className="border-t border-[var(--border-subtle)] p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-card)] p-3 shadow-[var(--shadow-card)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-secondary)] text-xs font-bold text-[var(--text-on-accent)]">
                  {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--text-strong)]">
                    {user.name ?? user.email}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-[var(--text-soft)]">
                    {user.roles.includes("super_admin")
                      ? "super_admin"
                      : user.roles.join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-4 backdrop-blur md:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-tint)] text-[10px] font-bold text-[var(--accent-primary)] lg:hidden">
                AC
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  {isSuperAdminPlatformContext
                    ? "Platform administration"
                    : (workspaceOrganization?.name ?? "AgentCore workspace")}
                </p>
                <h1 className="text-sm font-semibold text-[var(--text-strong)] md:text-base">
                  {isSuperAdminPlatformContext
                    ? "Super Admin Console"
                    : "Operations Console"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health ? (
                <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-muted)] sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-secondary)] shadow-[0_0_10px_rgba(45,212,191,0.65)]" />
                  API {health.status} · DB {health.database}
                </div>
              ) : null}
              <button
                type="button"
                onClick={loadAll}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setTheme((current) =>
                    current === "light" ? "dark" : "light",
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
                title={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
              >
                {theme === "light" ? (
                  <MoonStar className="h-4 w-4" />
                ) : (
                  <SunMedium className="h-4 w-4" />
                )}
              </button>
              <StatusPill status={health?.status ?? "checking"} />
              {user ? (
                <button
                  onClick={handleLogout}
                  className="h-9 rounded-xl border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-sidebar)] px-4 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`h-9 shrink-0 rounded-md px-3 text-sm ${
                    activeTab === item.id
                      ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                      : "border border-[var(--border-strong)] text-[var(--text-base)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4 md:p-5">
            <section className="mx-auto min-w-0 max-w-[1640px]">
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Workspace / {navMeta[activeTab].mark}
                </p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-strong)]">
                      {navItems.find((item) => item.id === activeTab)?.label}
                    </h2>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      {navMeta[activeTab].description}
                    </p>
                  </div>
                  {usesPlatformTestWorkspace ? (
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
                      Platform Test Workspace
                    </span>
                  ) : null}
                </div>
              </div>
              {activeTab === "dashboard" ? (
                <DashboardView
                  health={health}
                  observability={observability}
                  organization={workspaceOrganization}
                  users={users}
                  products={products}
                  aiProviders={aiProviders}
                />
              ) : null}
              {activeTab === "organizations" ? (
                <OrganizationsView
                  organizations={organizations}
                  selectedOrganizationId={selectedOrganizationId}
                  onSelect={setSelectedOrganizationId}
                  onCreate={createOrganization}
                />
              ) : null}
              {activeTab === "inbox" ? (
                <InboxView
                  filters={filters}
                  setFilters={setFilters}
                  conversations={conversations}
                  selectedConversation={selectedConversation}
                  onLoadConversations={loadConversations}
                  onSelectConversation={loadConversation}
                  onSendReply={sendAgentReply}
                  onUpdateStatus={updateConversationStatus}
                />
              ) : null}
              {activeTab === "knowledge" ? (
                <KnowledgeView
                  sources={knowledgeSources}
                  categories={knowledgeCategories}
                  folders={knowledgeFolders}
                  pageInfo={knowledgePageInfo}
                  onQueryChange={loadKnowledgeSources}
                  onRefresh={refreshKnowledgeSourcesSilently}
                  onCreate={createKnowledgeSource}
                  onCreateUrl={createWebsiteKnowledgeSource}
                  onUploadFile={uploadKnowledgeFile}
                  onIngest={ingestKnowledgeSource}
                  onCancelIngestion={cancelKnowledgeIngestion}
                  onReleaseQuarantine={releaseKnowledgeQuarantine}
                  onDelete={deleteKnowledgeSource}
                  onUpdate={updateKnowledgeSource}
                  onUpdateCategory={updateKnowledgeCategory}
                  onDeleteCategory={deleteKnowledgeCategory}
                  onUpdateFolder={updateKnowledgeFolder}
                  onDeleteFolder={deleteKnowledgeFolder}
                  onLoadVersions={loadKnowledgeVersions}
                  onCreateCategory={createKnowledgeCategory}
                  onCreateFolder={createKnowledgeFolder}
                  canManageSettings={Boolean(
                    user?.roles.some((role) =>
                      ["super_admin", "org_admin"].includes(role),
                    ),
                  )}
                  workspaceName={
                    usesPlatformTestWorkspace
                      ? "Platform Test Workspace"
                      : (workspaceOrganization?.name ?? "Current workspace")
                  }
                  extractionSettings={knowledgeExtractionSettings}
                  settingsError={knowledgeSettingsError}
                  ocrProviders={knowledgeOcrProviders}
                  aiProviders={aiProviders}
                  onSaveExtractionSettings={saveKnowledgeExtractionSettings}
                  onLoadSettings={loadKnowledgeSettings}
                  onSaveOcrProvider={saveKnowledgeOcrProvider}
                  onDeleteOcrProvider={deleteKnowledgeOcrProvider}
                />
              ) : null}
              {activeTab === "appointments" ? (
                <AppointmentsView
                  services={appointmentServices}
                  staff={appointmentStaff}
                  resources={appointmentResources}
                  slots={appointmentSlots}
                  bookings={appointmentBookings}
                  calendarConnections={appointmentCalendarConnections}
                  policy={appointmentPolicy}
                  blackouts={appointmentBlackouts}
                  waitlist={appointmentWaitlist}
                  onCreateService={createAppointmentService}
                  onUpdateService={updateAppointmentService}
                  onCreateStaff={createAppointmentStaff}
                  onCreateResource={createAppointmentResource}
                  onCreateAvailability={createStaffAvailability}
                  onCreateTimeOff={createStaffTimeOff}
                  onSearchSlots={searchAppointmentSlots}
                  onCreateBooking={createAppointmentBooking}
                  onRescheduleBooking={rescheduleAppointmentBooking}
                  onCancelBooking={cancelAppointmentBooking}
                  onCheckInBooking={checkInAppointmentBooking}
                  onCancelSeries={cancelAppointmentSeries}
                  onUpdatePolicy={updateAppointmentPolicy}
                  onCreateBlackout={createAppointmentBlackout}
                  onDeleteBlackout={deleteAppointmentBlackout}
                  onConnectCalendar={connectAppointmentCalendar}
                  onDisconnectCalendar={disconnectAppointmentCalendar}
                />
              ) : null}
              {activeTab === "whatsapp" ? (
                <WhatsAppView
                  configs={whatsAppConfigs}
                  selectedConfigId={selectedWhatsAppConfigId}
                  templates={whatsAppTemplates}
                  conversations={whatsAppConversations}
                  selectedConversation={selectedWhatsAppConversation}
                  users={users}
                  currentUser={user}
                  canConfigure={whatsAppAccess.canConfigure}
                  canManageAgents={whatsAppAccess.canManageAgents}
                  filters={whatsAppFilters}
                  setFilters={setWhatsAppFilters}
                  onCreateConfig={createWhatsAppConfig}
                  onUpdateConfig={updateWhatsAppConfig}
                  onSelectConfig={selectWhatsAppConfig}
                  onSyncTemplates={syncWhatsAppTemplates}
                  onLoadConversations={() =>
                    loadWhatsAppConversations({ page: 1 })
                  }
                  onPageChange={(page) => loadWhatsAppConversations({ page })}
                  onSelectConversation={loadWhatsAppConversation}
                  onSendReply={sendWhatsAppReply}
                  onSendTemplate={sendWhatsAppTemplate}
                  onSendMedia={sendWhatsAppMedia}
                  onOpenMedia={openWhatsAppMedia}
                  onRetryMessage={retryWhatsAppMessage}
                  onAssign={assignWhatsAppConversation}
                  onRequestHandoff={requestWhatsAppHandoff}
                  onUpdateStatus={updateWhatsAppStatus}
                />
              ) : null}
              {activeTab === "voice" ? (
                <VoiceReceptionistView
                  configs={voiceConfigs}
                  calls={voiceCalls}
                  selectedCall={selectedVoiceCall}
                  users={users}
                  canConfigure={voiceAccess.canConfigure}
                  canManageAgents={voiceAccess.canManageAgents}
                  apiBaseUrl={API_BASE_URL}
                  filters={voiceFilters}
                  setFilters={setVoiceFilters}
                  onSaveConfig={saveVoiceConfig}
                  onLoadCalls={loadVoiceCalls}
                  onSelectCall={loadVoiceCall}
                  onSendMessage={sendVoiceMessage}
                  onRequestHandoff={requestVoiceHandoff}
                  onRouteCall={routeVoiceCall}
                  onUpdateStatus={updateVoiceStatus}
                  onAssignCall={assignVoiceCall}
                />
              ) : null}
              {activeTab === "widget" ? (
                <WidgetView
                  configs={widgetConfigs}
                  pageInfo={widgetPageInfo}
                  config={widgetConfig}
                  folders={knowledgeFolders}
                  onSelect={(widget) => {
                    setWidgetConfig(widget);
                    setWidgetTestConversation(null);
                    setWidgetVisitorToken(null);
                  }}
                  onBack={() => {
                    setWidgetConfig(null);
                    setWidgetTestConversation(null);
                    setWidgetVisitorToken(null);
                  }}
                  onCreate={createWidgetConfig}
                  onSubmit={updateWidgetConfig}
                  onDelete={deleteWidgetConfig}
                  onPageChange={loadWidgetConfig}
                  testConversation={widgetTestConversation}
                  onSendTestMessage={sendWidgetTestMessage}
                  onResetTestChat={() => {
                    setWidgetTestConversation(null);
                    setWidgetVisitorToken(null);
                  }}
                  apiBaseUrl={API_BASE_URL}
                />
              ) : null}
              {activeTab === "users" ? (
                <UsersView
                  users={users}
                  organizations={organizations}
                  selectedOrganizationId={selectedOrganizationId ?? user.orgId}
                  isSuperAdmin={user.roles.includes("super_admin")}
                  onCreate={createUser}
                  onInvite={createInvite}
                  onUpdateAccess={updateUserAccess}
                  onToggleStatus={toggleUserStatus}
                />
              ) : null}
              {activeTab === "products" ? (
                <ProductsView
                  products={products}
                  onUpdateStatus={updateProductStatus}
                />
              ) : null}
              {activeTab === "ai" ? (
                <AIProvidersView
                  providers={aiProviders}
                  onCreate={createAIProvider}
                />
              ) : null}
              {activeTab === "audit" ? <AuditView logs={auditLogs} /> : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
