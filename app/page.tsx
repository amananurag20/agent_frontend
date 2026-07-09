"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AIProvidersView } from "@/components/ai-providers-view";
import { AppointmentsView } from "@/components/appointments-view";
import { AuditView } from "@/components/audit-view";
import { DashboardView } from "@/components/dashboard-view";
import { InboxView } from "@/components/inbox-view";
import { KnowledgeView } from "@/components/knowledge-view";
import { LoginPanel } from "@/components/login-panel";
import { ProductsView } from "@/components/products-view";
import { HealthPanel, StatusPill, Toolbar, UserPanel } from "@/components/ui";
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
  Health,
  KnowledgeSource,
  ObservabilitySummary,
  Organization,
  ProductEntitlement,
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

const navItems: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
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

export default function Home() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("agentcore_token");
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = window.localStorage.getItem("agentcore_user");
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  });
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [health, setHealth] = useState<Health | null>(null);
  const [observability, setObservability] =
    useState<ObservabilitySummary | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductEntitlement[]>([]);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [conversations, setConversations] = useState<ConversationList | null>(
    null,
  );
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(
    [],
  );
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

  useEffect(() => {
    void loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...authHeaders,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async function uploadApi<T>(path: string, body: FormData): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
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
    await Promise.all([
      loadHealth(),
      loadObservability(),
      loadOrganization(),
      loadUsers(),
      loadProducts(),
      loadAIProviders(),
      loadConversations(),
      loadWidgetConfig(),
      loadKnowledgeSources(),
      loadAppointmentServices(),
      loadAppointmentStaff(),
      loadAppointmentBookings(),
      loadWhatsAppConfigs(),
      loadWhatsAppConversations(),
      loadVoiceConfigs(),
      loadVoiceCalls(),
      loadAuditLogs(),
    ]);
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

  async function loadUsers() {
    const result = await run(() => api<User[]>("/users"));
    if (result) setUsers(result);
  }

  async function loadProducts() {
    const result = await run(() =>
      api<ProductEntitlement[]>("/organizations/me/products"),
    );
    if (result) setProducts(result);
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

  async function loadKnowledgeSources() {
    const result = await run(() => api<KnowledgeSource[]>("/knowledge/sources"));
    if (result) setKnowledgeSources(result);
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
      setToken(result.accessToken);
      setUser(result.user);
      window.localStorage.setItem("agentcore_token", result.accessToken);
      window.localStorage.setItem("agentcore_user", JSON.stringify(result.user));
    }
  }

  function handleLogout() {
    window.localStorage.removeItem("agentcore_token");
    window.localStorage.removeItem("agentcore_user");
    setToken(null);
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
            name: String(form.get("name")),
            rawText: String(form.get("rawText")),
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
            name: String(form.get("name")),
            url: String(form.get("url")),
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
    const result = await run(
      () => uploadApi<KnowledgeSource>("/knowledge/sources/upload", form),
      "File uploaded",
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
          }),
        }),
      "Widget saved",
    );

    if (result) setWidgetConfig(result);
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
          }),
        }),
      "User created",
    );

    if (result) {
      formElement.reset();
      await loadUsers();
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

  async function updateProductStatus(
    productKey: string,
    status: "enabled" | "disabled",
  ) {
    await run(
      () =>
        api<ProductEntitlement>(`/organizations/me/products/${productKey}`, {
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
    await run(
      () =>
        api<AIProvider>("/ai/providers", {
          method: "POST",
          body: JSON.stringify({
            provider: String(form.get("provider")),
            name: String(form.get("name")),
            apiKey: String(form.get("apiKey")) || undefined,
            chatModel: String(form.get("chatModel")) || undefined,
            embeddingModel: String(form.get("embeddingModel")) || undefined,
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

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#d8dde6] bg-[#101828] text-white lg:block">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="text-lg font-semibold">AgentCore</div>
            <div className="mt-1 text-xs text-[#a9b4c8]">Operations Console</div>
          </div>
          <nav className="space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex h-10 w-full items-center justify-between rounded-md px-3 text-sm transition ${
                  activeTab === item.id
                    ? "bg-white text-[#101828]"
                    : "text-[#dbe3f3] hover:bg-white/10"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs">›</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[#d8dde6] bg-white px-4 md:px-6">
            <div>
              <h1 className="text-base font-semibold md:text-lg">
                AgentCore Console
              </h1>
              <p className="text-xs text-[#667085]">
                {health
                  ? `API ${health.status} · DB ${health.database}`
                  : "Checking API"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={health?.status ?? "checking"} />
              {user ? (
                <button
                  onClick={handleLogout}
                  className="h-9 rounded-md border border-[#cfd6e2] px-3 text-sm hover:bg-[#f2f4f7]"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

          <div className="border-b border-[#d8dde6] bg-white px-4 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`h-9 shrink-0 rounded-md px-3 text-sm ${
                    activeTab === item.id
                      ? "bg-[#101828] text-white"
                      : "border border-[#cfd6e2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!user ? (
            <LoginPanel onSubmit={handleLogin} state={state} />
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-w-0">
                <Toolbar state={state} onRefresh={loadAll} />
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
                    onCreate={createKnowledgeSource}
                    onCreateUrl={createWebsiteKnowledgeSource}
                    onUploadFile={uploadKnowledgeFile}
                    onIngest={ingestKnowledgeSource}
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
                  />
                ) : null}
                {activeTab === "users" ? (
                  <UsersView
                    users={users}
                    onCreate={createUser}
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

              <aside className="space-y-4">
                <HealthPanel health={health} />
                <UserPanel user={user} />
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
