"use client";

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
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
  AppointmentService,
  AppointmentSlot,
  AppointmentStaff,
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
  VoiceCallList,
  VoiceConfig,
  WidgetConfig,
  WhatsAppConfig,
  WhatsAppConversation,
  WhatsAppConversationList,
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

const navMeta: Record<TabId, { icon: LucideIcon; mark: string; description: string }> = {
  dashboard: { icon: LayoutDashboard, mark: "DB", description: "Live platform overview" },
  organizations: { icon: Building2, mark: "OR", description: "Tenants, plans and ownership" },
  inbox: { icon: MessagesSquare, mark: "CH", description: "Customer conversations and handoff" },
  knowledge: { icon: BookOpenText, mark: "KN", description: "Sources, ingestion and access levels" },
  appointments: { icon: CalendarDays, mark: "AP", description: "Services, availability and bookings" },
  whatsapp: { icon: MessageSquare, mark: "WA", description: "WhatsApp automation and support" },
  voice: { icon: PhoneCall, mark: "VO", description: "Calls, routing and transcripts" },
  widget: { icon: Waypoints, mark: "WG", description: "Website assistant configuration" },
  users: { icon: Users2, mark: "US", description: "Roles, clearance and product access" },
  products: { icon: Boxes, mark: "PR", description: "Organization product entitlements" },
  ai: { icon: Bot, mark: "AI", description: "Models, providers and credentials" },
  audit: { icon: ShieldCheck, mark: "AU", description: "Security and operations activity" },
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductEntitlement[]>([]);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [conversations, setConversations] = useState<ConversationList | null>(
    null,
  );
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [widgetTestConversation, setWidgetTestConversation] =
    useState<Conversation | null>(null);
  const [widgetVisitorToken, setWidgetVisitorToken] = useState<string | null>(
    null,
  );
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(
    [],
  );
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>([]);
  const [knowledgeFolders, setKnowledgeFolders] = useState<KnowledgeFolder[]>([]);
  const [knowledgePageInfo, setKnowledgePageInfo] = useState<KnowledgePageInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
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
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>(
    [],
  );
  const [appointmentBookings, setAppointmentBookings] = useState<
    AppointmentBooking[]
  >([]);
  const [whatsAppConfigs, setWhatsAppConfigs] = useState<WhatsAppConfig[]>([]);
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
  });
  const [voiceFilters, setVoiceFilters] = useState({
    status: "waiting_for_agent",
    search: "",
  });

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const visibleNavItems = useMemo(() => {
    if (!user) return navItems.filter((item) => item.id === "dashboard");
    const isSuperAdmin = user.roles.includes("super_admin");
    const isOrgAdmin = user.roles.includes("org_admin");
    const grants = [
      ...(user.productAccess ?? []),
      ...(user.customRoles ?? []).flatMap((role) => role.productAccess),
    ];
    const isEnabled = (productKey: ProductKey) =>
      isSuperAdmin ||
      products.some(
        (item) => item.product.key === productKey && item.status === "enabled",
      );
    const canConfigureChat = isSuperAdmin || isOrgAdmin || grants.some((access) => access.productKey === "customer_chat" && access.canConfigure);
    const canUse = (productKey: ProductKey) =>
      isEnabled(productKey) &&
      (isSuperAdmin ||
        isOrgAdmin ||
        grants.some((access) => access.productKey === productKey && access.canUse));
    const canManageAgents = grants.some((access) => access.canManageAgents);
    const canManageKnowledge = grants.some(
      (access) => access.canManageKnowledge || access.canConfigure,
    );
    return navItems.filter((item) => {
      if (item.id === "organizations") return isSuperAdmin;
      if (item.id === "users") return isSuperAdmin || isOrgAdmin || canManageAgents;
      if (item.id === "knowledge") return isSuperAdmin || isOrgAdmin || canManageKnowledge;
      if (["products", "ai", "audit"].includes(item.id)) return isSuperAdmin || isOrgAdmin;
      if (item.id === "inbox") return canUse("customer_chat");
      if (item.id === "widget") return canUse("customer_chat") && canConfigureChat;
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
    if (!token || !selectedOrganizationId || !user?.roles.includes("super_admin")) return;
    void loadProducts();
    void loadUsers();
    void loadKnowledgeSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId]);

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
      isSuperAdmin ||
      Boolean(
        loadedProducts?.some(
          (item) => item.product.key === productKey && item.status === "enabled",
        ),
      );
    const canUse = (productKey: ProductKey) =>
      isEnabled(productKey) &&
      (isSuperAdmin ||
        isOrgAdmin ||
        grants.some((access) => access.productKey === productKey && access.canUse));

    const baseTasks: Array<Promise<unknown>> = [
      loadHealth(),
      loadOrganization(),
    ];
    if (isSuperAdmin) baseTasks.push(loadOrganizations());
    if (isSuperAdmin || isOrgAdmin) {
      baseTasks.push(
        loadObservability(),
        loadAIProviders(),
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
        loadAppointmentBookings(),
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
      setSelectedOrganizationId((current) => current ?? result[0]?.id ?? null);
    }
    return result;
  }

  async function loadUsers() {
    const result = await run(() => api<User[]>("/users"));
    if (result) setUsers(result);
  }

  async function loadProducts() {
    const path = user?.roles.includes("super_admin") && selectedOrganizationId
      ? `/organizations/${selectedOrganizationId}/products`
      : "/organizations/me/products";
    const result = await run(() =>
      api<ProductEntitlement[]>(path),
    );
    if (result) setProducts(result);
    return result;
  }

  async function loadAIProviders() {
    const result = await run(() => api<AIProvider[]>("/ai/providers"));
    if (result) setAIProviders(result);
  }

  async function loadConversations() {
    const params = new URLSearchParams({
      limit: "30",
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

  async function loadWidgetConfig() {
    const result = await run(() =>
      api<WidgetConfig>("/customer-chat/widget-config"),
    );
    if (result) setWidgetConfig(result);
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
    if (nextQuery.quarantined !== undefined) sourceParams.set("quarantined", String(nextQuery.quarantined));
    const taxonomyQuery = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const result = await run(() => Promise.all([
      api<KnowledgeSourceList>(`/knowledge/sources?${sourceParams.toString()}`),
      api<KnowledgeCategory[]>(`/knowledge/taxonomy/categories${taxonomyQuery}`),
      api<KnowledgeFolder[]>(`/knowledge/taxonomy/folders${taxonomyQuery}`),
    ]));
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
    if (knowledgeQuery.search) sourceParams.set("search", knowledgeQuery.search);
    if (knowledgeQuery.status) sourceParams.set("status", knowledgeQuery.status);
    if (knowledgeQuery.type) sourceParams.set("type", knowledgeQuery.type);
    if (knowledgeQuery.folderId) sourceParams.set("folderId", knowledgeQuery.folderId);
    if (knowledgeQuery.quarantined !== undefined) sourceParams.set("quarantined", String(knowledgeQuery.quarantined));
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
    const result = await run(() =>
      api<AppointmentService[]>("/appointment-booking/services"),
    );
    if (result) setAppointmentServices(result);
  }

  async function loadAppointmentStaff() {
    const result = await run(() =>
      api<AppointmentStaff[]>("/appointment-booking/staff"),
    );
    if (result) setAppointmentStaff(result);
  }

  async function loadAppointmentBookings() {
    const result = await run(() =>
      api<AppointmentBookingList>("/appointment-booking/bookings?limit=30"),
    );
    if (result) setAppointmentBookings(result.data);
  }

  async function loadWhatsAppConfigs() {
    const result = await run(() =>
      api<WhatsAppConfig[]>("/whatsapp-assistant/configs"),
    );
    if (result) setWhatsAppConfigs(result);
  }

  async function loadWhatsAppConversations() {
    const params = new URLSearchParams({
      limit: "30",
      ...(whatsAppFilters.status ? { status: whatsAppFilters.status } : {}),
      ...(whatsAppFilters.search ? { search: whatsAppFilters.search } : {}),
    });
    const result = await run(() =>
      api<WhatsAppConversationList>(
        `/whatsapp-assistant/conversations?${params}`,
      ),
    );

    if (result) {
      setWhatsAppConversations(result);
      setSelectedWhatsAppConversation((current) =>
        current
          ? (result.data.find((item) => item.id === current.id) ?? current)
          : (result.data[0] ?? null),
      );
    }
  }

  async function loadWhatsAppConversation(id: string) {
    const result = await run(() =>
      api<WhatsAppConversation>(`/whatsapp-assistant/conversations/${id}`),
    );
    if (result) setSelectedWhatsAppConversation(result);
  }

  async function loadVoiceConfigs() {
    const result = await run(() =>
      api<VoiceConfig[]>("/voice-receptionist/configs"),
    );
    if (result) setVoiceConfigs(result);
  }

  async function loadVoiceCalls() {
    const params = new URLSearchParams({
      limit: "30",
      ...(voiceFilters.status ? { status: voiceFilters.status } : {}),
      ...(voiceFilters.search ? { search: voiceFilters.search } : {}),
    });
    const result = await run(() =>
      api<VoiceCallList>(`/voice-receptionist/calls?${params}`),
    );

    if (result) {
      setVoiceCalls(result);
      setSelectedVoiceCall((current) =>
        current
          ? (result.data.find((item) => item.id === current.id) ?? current)
          : (result.data[0] ?? null),
      );
    }
  }

  async function loadVoiceCall(id: string) {
    const result = await run(() =>
      api<VoiceCall>(`/voice-receptionist/calls/${id}`),
    );
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
    setToken(auth.accessToken);
    setRefreshToken(auth.refreshToken);
    setUser(auth.user);
    window.localStorage.setItem("agentcore_token", auth.accessToken);
    window.localStorage.setItem(
      "agentcore_refresh_token",
      auth.refreshToken,
    );
    window.localStorage.setItem("agentcore_user", JSON.stringify(auth.user));
  }

  function clearSession() {
    window.localStorage.removeItem("agentcore_token");
    window.localStorage.removeItem("agentcore_refresh_token");
    window.localStorage.removeItem("agentcore_user");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
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
            body: JSON.stringify({ status }),
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

  async function createWebsiteKnowledgeSource(event: FormEvent<HTMLFormElement>) {
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
            recrawlIntervalHours: Number(form.get("recrawlIntervalHours") || 24),
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
    if (selectedOrganizationId) form.set("organizationId", selectedOrganizationId);
    if (!form.get("sensitivityLevel")) form.delete("sensitivityLevel");
    const result = await run(
      () => uploadApi<KnowledgeSource>("/knowledge/sources/upload", form),
      "File uploaded",
    );

    if (result) {
      formElement.reset();
      await loadKnowledgeSources();
    }
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
      () => api<KnowledgeCategory>("/knowledge/taxonomy/categories", {
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
      () => api<KnowledgeFolder>("/knowledge/taxonomy/folders", {
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

  async function releaseKnowledgeQuarantine(id: string) {
    await run(
      () => api<KnowledgeSource>(`/knowledge/sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isQuarantined: false }),
      }),
      "Knowledge source approved",
    );
    await loadKnowledgeSources();
  }

  async function deleteKnowledgeSource(id: string) {
    const result = await run(
      () => api<{ deleted: boolean }>(`/knowledge/sources/${id}`, {
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
      () => api<KnowledgeSource>(`/knowledge/sources/${id}`, {
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
      () => api<KnowledgeCategory>(`/knowledge/taxonomy/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
      "Category updated",
    );
    if (result) await loadKnowledgeSources();
  }

  async function deleteKnowledgeCategory(id: string) {
    const result = await run(
      () => api<{ deleted: boolean }>(`/knowledge/taxonomy/categories/${id}`, { method: "DELETE" }),
      "Category deleted",
    );
    if (result) await loadKnowledgeSources();
  }

  async function updateKnowledgeFolder(id: string, name: string) {
    const result = await run(
      () => api<KnowledgeFolder>(`/knowledge/taxonomy/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
      "Folder updated",
    );
    if (result) await loadKnowledgeSources();
  }

  async function deleteKnowledgeFolder(id: string) {
    const result = await run(
      () => api<{ deleted: boolean }>(`/knowledge/taxonomy/folders/${id}`, { method: "DELETE" }),
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

  async function updateWidgetConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const allowedDomains = String(form.get("allowedDomains"))
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const result = await run(
      () =>
        api<WidgetConfig>("/customer-chat/widget-config", {
          method: "PATCH",
          body: JSON.stringify({
            enabled: form.get("enabled") === "on",
            greetingText: String(form.get("greetingText")),
            allowedDomains,
            settings: {
              assistantName: String(form.get("assistantName")),
              primaryColor: String(form.get("primaryColor")),
              launcherLabel: String(form.get("launcherLabel")),
              position: String(form.get("position")),
            },
          }),
        }),
      "Widget saved",
    );

    if (result) setWidgetConfig(result);
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
      () => api<Organization>("/organizations", {
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
      setSelectedOrganizationId(result.id);
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
      () => api<User>(`/users/${target.id}/roles`, {
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
    const path = user?.roles.includes("super_admin") && selectedOrganizationId
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
            name: String(form.get("name")),
            description: String(form.get("description")) || undefined,
            durationMinutes: Number(form.get("durationMinutes")),
            bufferBeforeMinutes: Number(form.get("bufferBeforeMinutes") || 0),
            bufferAfterMinutes: Number(form.get("bufferAfterMinutes") || 0),
          }),
        }),
      "Appointment service created",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentServices();
    }
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
    const result = await run(
      () =>
        api<AppointmentBooking>("/appointment-booking/bookings", {
          method: "POST",
          body: JSON.stringify({
            serviceId: String(form.get("serviceId")),
            staffId: staffId || undefined,
            customerName: String(form.get("customerName")),
            customerEmail: String(form.get("customerEmail")) || undefined,
            startAt: toIsoDateTime(form.get("startAt")),
            notes: String(form.get("notes")) || undefined,
          }),
        }),
      "Booking created",
    );

    if (result) {
      formElement.reset();
      await loadAppointmentBookings();
    }
  }

  async function rescheduleAppointmentBooking(event: FormEvent<HTMLFormElement>) {
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

  async function createWhatsAppConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<WhatsAppConfig>("/whatsapp-assistant/configs", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            provider: String(form.get("provider")),
            phoneNumberId: String(form.get("phoneNumberId")) || undefined,
            businessAccountId:
              String(form.get("businessAccountId")) || undefined,
            accessToken: String(form.get("accessToken")) || undefined,
            webhookVerifyToken:
              String(form.get("webhookVerifyToken")) || undefined,
            defaultLocale: String(form.get("defaultLocale")) || "en",
          }),
        }),
      "WhatsApp config saved",
    );

    if (result) {
      formElement.reset();
      await loadWhatsAppConfigs();
    }
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

  async function createVoiceConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await run(
      () =>
        api<VoiceConfig>("/voice-receptionist/configs", {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name")),
            provider: String(form.get("provider")),
            phoneNumber: String(form.get("phoneNumber")) || undefined,
            sipDomain: String(form.get("sipDomain")) || undefined,
            apiKey: String(form.get("apiKey")) || undefined,
            webhookVerifyToken:
              String(form.get("webhookVerifyToken")) || undefined,
            sttProvider: String(form.get("sttProvider")) || undefined,
            ttsVoice: String(form.get("ttsVoice")) || undefined,
            transferPhoneNumber:
              String(form.get("transferPhoneNumber")) || undefined,
            voicemailEnabled: form.get("voicemailEnabled") === "on",
          }),
        }),
      "Voice config saved",
    );

    if (result) {
      formElement.reset();
      await loadVoiceConfigs();
    }
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

  async function routeVoiceCall(action: "transfer" | "voicemail" | "close") {
    if (!selectedVoiceCall) return;

    const result = await run(
      () =>
        api<{ call: VoiceCall }>(
          `/voice-receptionist/calls/${selectedVoiceCall.id}/route`,
          {
            method: "POST",
            body: JSON.stringify({ action }),
          },
        ),
      "Voice route queued",
    );

    if (result) {
      setSelectedVoiceCall(result.call);
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
      <main className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
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
      <main className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
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
    <main className={`agentcore-app theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
      <div className="flex min-h-screen">
        <aside className="hidden h-screen w-[272px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)] text-[var(--text-strong)] lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-[var(--border-subtle)] px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-sm font-bold text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]">AC</div>
            <div>
              <div className="text-base font-semibold tracking-wide">AgentCore</div>
              <div className="mt-0.5 text-[11px] uppercase text-[var(--text-soft)]">AI Business Suite</div>
            </div>
          </div>
          <div className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Workspace</div>
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
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${activeTab === item.id ? "bg-white/15 text-[var(--text-on-accent)]" : "bg-[var(--surface-tint)] text-[var(--accent-primary)]"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {activeTab === item.id ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)]" /> : null}
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
                  <p className="truncate text-xs font-medium text-[var(--text-strong)]">{user.name ?? user.email}</p>
                  <p className="mt-0.5 truncate text-[10px] text-[var(--text-soft)]">{user.roles.join(" · ")}</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-4 backdrop-blur md:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-tint)] text-[10px] font-bold text-[var(--accent-primary)] lg:hidden">AC</div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{organization?.name ?? "AgentCore workspace"}</p>
                <h1 className="text-sm font-semibold text-[var(--text-strong)] md:text-base">Operations Console</h1>
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
                onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
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
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">Workspace / {navMeta[activeTab].mark}</p>
                  <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-semibold text-[var(--text-strong)]">{navItems.find((item) => item.id === activeTab)?.label}</h2>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{navMeta[activeTab].description}</p>
                    </div>
                  </div>
                </div>
                {activeTab === "dashboard" ? (
                  <DashboardView
                    health={health}
                    observability={observability}
                    organization={organization}
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
                  />
                ) : null}
                {activeTab === "appointments" ? (
                  <AppointmentsView
                    services={appointmentServices}
                    staff={appointmentStaff}
                    slots={appointmentSlots}
                    bookings={appointmentBookings}
                    onCreateService={createAppointmentService}
                    onCreateStaff={createAppointmentStaff}
                    onCreateAvailability={createStaffAvailability}
                    onCreateTimeOff={createStaffTimeOff}
                    onSearchSlots={searchAppointmentSlots}
                    onCreateBooking={createAppointmentBooking}
                    onRescheduleBooking={rescheduleAppointmentBooking}
                    onCancelBooking={cancelAppointmentBooking}
                  />
                ) : null}
                {activeTab === "whatsapp" ? (
                  <WhatsAppView
                    configs={whatsAppConfigs}
                    conversations={whatsAppConversations}
                    selectedConversation={selectedWhatsAppConversation}
                    filters={whatsAppFilters}
                    setFilters={setWhatsAppFilters}
                    onCreateConfig={createWhatsAppConfig}
                    onLoadConversations={loadWhatsAppConversations}
                    onSelectConversation={loadWhatsAppConversation}
                    onSendReply={sendWhatsAppReply}
                    onRequestHandoff={requestWhatsAppHandoff}
                    onUpdateStatus={updateWhatsAppStatus}
                  />
                ) : null}
                {activeTab === "voice" ? (
                  <VoiceReceptionistView
                    configs={voiceConfigs}
                    calls={voiceCalls}
                    selectedCall={selectedVoiceCall}
                    filters={voiceFilters}
                    setFilters={setVoiceFilters}
                    onCreateConfig={createVoiceConfig}
                    onLoadCalls={loadVoiceCalls}
                    onSelectCall={loadVoiceCall}
                    onSendMessage={sendVoiceMessage}
                    onRequestHandoff={requestVoiceHandoff}
                    onRouteCall={routeVoiceCall}
                    onUpdateStatus={updateVoiceStatus}
                  />
                ) : null}
                {activeTab === "widget" ? (
                  <WidgetView
                    config={widgetConfig}
                    onSubmit={updateWidgetConfig}
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
