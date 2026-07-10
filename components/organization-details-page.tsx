"use client";

import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Blocks,
  Building2,
  ChevronRight,
  CreditCard,
  Globe2,
  LayoutGrid,
  Mail,
  Phone,
  Plus,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Users2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type {
  ApiState,
  AuthResponse,
  InviteResponse,
  Organization,
  ProductEntitlement,
  ProductKey,
  User,
} from "@/lib/types";
import { Card, CardHeader, Field, StateMessage, StatusPill } from "./ui";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

const productCatalog: Array<{
  key: ProductKey;
  name: string;
  description: string;
}> = [
  {
    key: "customer_chat",
    name: "Customer Chat",
    description: "Website chat, inbox routing, and agent handoff.",
  },
  {
    key: "appointment_booking",
    name: "Appointments",
    description: "Booking flows, availability, and scheduling automation.",
  },
  {
    key: "whatsapp_assistant",
    name: "WhatsApp",
    description: "Business messaging automation and support workflows.",
  },
  {
    key: "voice_receptionist",
    name: "Voice",
    description: "Receptionist calls, routing, and transcript handling.",
  },
];

type ThemeMode = "light" | "dark";
type OrganizationSection = "overview" | "team" | "products" | "settings";

export function OrganizationDetailsPage({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductEntitlement[]>([]);
  const [activeSection, setActiveSection] =
    useState<OrganizationSection>("overview");
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    message: null,
  });
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  async function loadPageData() {
    await run(
      async () => {
        const [organizationResult, usersResult, productsResult] =
          await Promise.all([
            api<Organization>(`/organizations/${organizationId}`),
            api<User[]>("/users"),
            api<ProductEntitlement[]>(
              `/organizations/${organizationId}/products`,
            ),
          ]);

        setOrganization(organizationResult);
        setUsers(usersResult.filter((entry) => entry.orgId === organizationId));
        setProducts(productsResult);
        return organizationResult;
      },
      undefined,
      { quietSuccess: true },
    );
  }

  useEffect(() => {
    const restoreSession = window.setTimeout(() => {
      const storedUser = window.localStorage.getItem("agentcore_user");
      const storedTheme = window.localStorage.getItem("agentcore_theme");
      setToken(window.localStorage.getItem("agentcore_token"));
      setRefreshToken(window.localStorage.getItem("agentcore_refresh_token"));
      setCurrentUser(storedUser ? (JSON.parse(storedUser) as User) : null);
      setTheme(storedTheme === "dark" ? "dark" : "light");
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(restoreSession);
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, organizationId]);

  async function refreshSession() {
    if (!refreshToken) return null;

    const response = await axios.request<AuthResponse>({
      url: `${API_BASE_URL}/auth/refresh`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { refreshToken },
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      window.localStorage.removeItem("agentcore_token");
      window.localStorage.removeItem("agentcore_refresh_token");
      window.localStorage.removeItem("agentcore_user");
      setToken(null);
      setRefreshToken(null);
      setCurrentUser(null);
      return null;
    }

    const payload = response.data;
    window.localStorage.setItem("agentcore_token", payload.accessToken);
    window.localStorage.setItem("agentcore_refresh_token", payload.refreshToken);
    window.localStorage.setItem("agentcore_user", JSON.stringify(payload.user));
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setCurrentUser(payload.user);
    return payload;
  }

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

  async function run<T>(
    action: () => Promise<T>,
    successMessage?: string,
    options?: { quietSuccess?: boolean },
  ) {
    try {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        message: options?.quietSuccess ? current.message : null,
      }));
      const result = await action();
      setState({
        loading: false,
        error: null,
        message: options?.quietSuccess ? null : successMessage ?? "Saved",
      });
      return result;
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Unexpected error",
        message: null,
      });
      return null;
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

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(
      () =>
        api<Organization>(`/organizations/${organizationId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: String(form.get("name")),
            slug: String(form.get("slug")),
            contactEmail: String(form.get("contactEmail")) || undefined,
            contactPhone: String(form.get("contactPhone")) || undefined,
            status: String(form.get("status")),
            plan: String(form.get("plan")),
            deploymentMode: String(form.get("deploymentMode")),
          }),
        }),
      "Organization updated",
    );

    if (result) {
      setOrganization(result);
    }
  }

  async function updateProductStatus(
    productKey: ProductKey,
    status: "enabled" | "disabled",
  ) {
    const result = await run(
      () =>
        api<ProductEntitlement>(
          `/organizations/${organizationId}/products/${productKey}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        ),
      "Product access updated",
    );

    if (result) {
      setProducts((current) => {
        const next = current.filter((item) => item.product.key !== productKey);
        return [...next, result].sort((a, b) =>
          a.product.name.localeCompare(b.product.name),
        );
      });
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
            orgId: organizationId,
            clearanceLevel: Number(form.get("clearanceLevel") || 0),
            productAccess: productAccessFromForm(form),
          }),
        }),
      "User created",
    );

    if (result) {
      formElement.reset();
      setIsCreateUserOpen(false);
      await loadPageData();
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name")).trim();
    const result = await run(
      () =>
        api<InviteResponse>("/auth/invites", {
          method: "POST",
          body: JSON.stringify({
            name: name || undefined,
            email: String(form.get("email")),
            roles: [String(form.get("role"))],
            orgId: organizationId,
            clearanceLevel: Number(form.get("clearanceLevel") || 0),
            productAccess: productAccessFromForm(form),
          }),
        }),
      "Invite created",
    );

    if (result) {
      formElement.reset();
      setIsInviteUserOpen(false);
      setState({
        loading: false,
        error: null,
        message: result.devInviteToken
          ? `Invite token: ${result.devInviteToken}`
          : `Invite created for ${result.email}`,
      });
      await loadPageData();
    }
  }

  async function toggleUserStatus(target: User) {
    const result = await run(
      () =>
        api<User>(`/users/${target.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: target.isActive === false ? "active" : "inactive",
          }),
        }),
      "User status updated",
    );

    if (result) {
      await loadPageData();
    }
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

    if (result) {
      await loadPageData();
    }
  }

  const entitlementMap = new Map(products.map((item) => [item.product.key, item]));
  const productCards = productCatalog.map((item) => {
    const entitlement = entitlementMap.get(item.key);
    return {
      ...item,
      status: entitlement?.status ?? "disabled",
    };
  });

  if (!isReady) {
    return (
      <main className={`theme-${theme} min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]`}>
        <CenteredNotice
          title="Loading"
          description="Restoring your console session..."
        />
      </main>
    );
  }

  if (!currentUser && !token) {
    return (
      <main className={`theme-${theme} min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]`}>
        <CenteredNotice
          title="Sign in required"
          description="Open the console first and sign in as a super admin to manage organizations."
        />
      </main>
    );
  }

  if (currentUser && !currentUser.roles.includes("super_admin")) {
    return (
      <main className={`theme-${theme} min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]`}>
        <CenteredNotice
          title="Access restricted"
          description="Only super admins can open organization management pages."
        />
      </main>
    );
  }

  return (
    <main
      className={`theme-${theme} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
    >
      <div className="mx-auto max-w-[1560px] px-4 py-6 md:px-6">
        <div className="mb-5 rounded-[30px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,var(--surface-card)_0%,var(--surface-card-muted)_100%)] p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => {
                    window.localStorage.setItem(
                      "agentcore_active_tab",
                      "organizations",
                    );
                    router.push("/");
                  }}
                  className="inline-flex items-center gap-2 hover:text-[var(--text-strong)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Organizations
                </button>
                <ChevronRight className="h-4 w-4 text-[var(--text-soft)]" />
                <span className="truncate">
                  {organization?.name ?? "Loading organization"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]">
                  <Building2 className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
                      {organization?.name ?? "Loading organization"}
                    </h1>
                    {organization ? (
                      <StatusPill status={organization.status} />
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
                    Control organization identity, product entitlements, and user
                    access from one management workspace.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <MetaChip icon={Workflow} label={organization?.slug ?? "—"} />
                    <MetaChip
                      icon={CreditCard}
                      label={formatValueLabel(organization?.plan ?? "free")}
                    />
                    <MetaChip
                      icon={Globe2}
                      label={formatValueLabel(
                        organization?.deploymentMode ?? "saas",
                      )}
                    />
                    <MetaChip icon={Users2} label={`${users.length} users`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsInviteUserOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
              >
                <Send className="h-4 w-4" />
                Invite user
              </button>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
              >
                <Plus className="h-4 w-4" />
                Add user
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMiniCard
              icon={Building2}
              label="Slug"
              value={organization?.slug ?? "—"}
            />
            <SummaryMiniCard
              icon={ShieldCheck}
              label="Status"
              value={organization?.status ?? "checking"}
              isStatus
            />
            <SummaryMiniCard
              icon={Users2}
              label="Users"
              value={String(users.length)}
            />
            <SummaryMiniCard
              icon={Blocks}
              label="Enabled products"
              value={String(
                productCards.filter((item) => item.status === "enabled").length,
              )}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
            <SectionTab
              icon={LayoutGrid}
              label="Overview"
              active={activeSection === "overview"}
              onClick={() => setActiveSection("overview")}
            />
            <SectionTab
              icon={Users2}
              label="Team"
              active={activeSection === "team"}
              onClick={() => setActiveSection("team")}
            />
            <SectionTab
              icon={Blocks}
              label="Products"
              active={activeSection === "products"}
              onClick={() => setActiveSection("products")}
            />
            <SectionTab
              icon={Settings2}
              label="Settings"
              active={activeSection === "settings"}
              onClick={() => setActiveSection("settings")}
            />
          </div>
        </div>

        {state.error || state.message ? (
          <div className="mb-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-[var(--shadow-card)]">
            <StateMessage state={state} />
          </div>
        ) : null}

        {activeSection === "overview" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-[var(--text-strong)]">
                  Organization profile
                </h2>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <DetailBlock
                  label="Organization name"
                  value={organization?.name ?? "—"}
                />
                <DetailBlock label="Slug" value={organization?.slug ?? "—"} />
                <DetailBlock
                  label="Plan"
                  value={formatValueLabel(organization?.plan ?? "free")}
                />
                <DetailBlock
                  label="Deployment"
                  value={formatValueLabel(organization?.deploymentMode ?? "saas")}
                />
                <DetailBlock
                  label="Contact email"
                  value={organization?.contactEmail ?? "Not provided"}
                  icon={Mail}
                />
                <DetailBlock
                  label="Contact phone"
                  value={organization?.contactPhone ?? "Not provided"}
                  icon={Phone}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-[var(--text-strong)]">
                  Access summary
                </h2>
              </CardHeader>
              <div className="space-y-3 p-5">
                <InsightRow
                  title="Primary admin"
                  subtitle={organization?.users?.[0]?.name ?? "No admin name"}
                  detail={organization?.users?.[0]?.email ?? "No admin email"}
                />
                <InsightRow
                  title="Enabled products"
                  subtitle={`${
                    productCards.filter((item) => item.status === "enabled")
                      .length
                  } modules active`}
                  detail="Customer chat, appointments, WhatsApp, and voice entitlements are managed here."
                />
                <InsightRow
                  title="Team footprint"
                  subtitle={`${users.length} managed accounts`}
                  detail="Use the Team section to add admins, product managers, agents, and end users."
                />
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === "settings" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-strong)]">
                  Organization settings
                </h2>
              </div>
            </CardHeader>
            {organization ? (
              <form
                onSubmit={saveOrganization}
                className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3"
              >
                <div className="xl:col-span-2">
                  <Field label="Organization name">
                    <input
                      name="name"
                      className="input"
                      defaultValue={organization.name}
                      required
                    />
                  </Field>
                </div>
                <Field label="Status">
                  <select
                    name="status"
                    className="input"
                    defaultValue={organization.status}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </Field>
                <Field label="Slug">
                  <input
                    name="slug"
                    className="input"
                    defaultValue={organization.slug}
                    required
                  />
                </Field>
                <Field label="Plan">
                  <select
                    name="plan"
                    className="input"
                    defaultValue={organization.plan}
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </Field>
                <Field label="Deployment">
                  <select
                    name="deploymentMode"
                    className="input"
                    defaultValue={organization.deploymentMode}
                  >
                    <option value="saas">SaaS</option>
                    <option value="local">Local</option>
                  </select>
                </Field>
                <Field label="Contact email">
                  <input
                    name="contactEmail"
                    type="email"
                    className="input"
                    defaultValue={organization.contactEmail ?? ""}
                  />
                </Field>
                <Field label="Contact phone">
                  <input
                    name="contactPhone"
                    className="input"
                    defaultValue={organization.contactPhone ?? ""}
                  />
                </Field>
                <div className="md:col-span-2 xl:col-span-3 flex justify-end">
                  <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
                    <Save className="h-4 w-4" />
                    Save organization
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 text-sm text-[var(--text-muted)]">
                Loading organization settings...
              </div>
            )}
          </Card>
        ) : null}

        {activeSection === "products" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--text-strong)]">
                    Product entitlements
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Enable or disable platform modules for this organization.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-tint)] px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  {productCards.filter((item) => item.status === "enabled").length}{" "}
                  enabled
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[var(--surface-card-muted)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {productCards.map((product) => (
                    <tr key={product.key}>
                      <td className="px-5 py-4 font-medium text-[var(--text-strong)]">
                        {product.name}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-muted)]">
                        {product.description}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={product.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateProductStatus(product.key, "enabled")
                            }
                            className={`h-9 rounded-xl px-3 text-sm ${
                              product.status === "enabled"
                                ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                                : "border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                            }`}
                          >
                            Enable
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateProductStatus(product.key, "disabled")
                            }
                            className={`h-9 rounded-xl px-3 text-sm ${
                              product.status === "disabled"
                                ? "bg-[var(--neutral-bg)] text-[var(--neutral-text)]"
                                : "border border-[var(--border-strong)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                            }`}
                          >
                            Disable
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {activeSection === "team" ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--text-strong)]">
                    Organization team
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Add users, invite admins, and adjust role-based access for
                    this organization.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteUserOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
                  >
                    <Send className="h-4 w-4" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateUserOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-3 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add user
                  </button>
                </div>
              </div>
            </CardHeader>
            <div className="divide-y divide-[var(--border-subtle)]">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onUpdateAccess={updateUserAccess}
                  onToggleStatus={toggleUserStatus}
                />
              ))}
              {!users.length ? (
                <div className="p-6 text-sm text-[var(--text-muted)]">
                  No users found for this organization yet.
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      {isCreateUserOpen ? (
        <UserModal
          title="Add user directly"
          description="Create a user immediately inside this organization."
          submitLabel="Create user"
          onClose={() => setIsCreateUserOpen(false)}
          onSubmit={createUser}
          includePassword
        />
      ) : null}

      {isInviteUserOpen ? (
        <UserModal
          title="Invite user"
          description="Send an invite token and let the user complete their password setup."
          submitLabel="Create invite"
          onClose={() => setIsInviteUserOpen(false)}
          onSubmit={createInvite}
        />
      ) : null}
    </main>
  );
}

function UserRow({
  user,
  onUpdateAccess,
  onToggleStatus,
}: {
  user: User;
  onUpdateAccess: (
    user: User,
    role: string,
    productKeys: ProductKey[],
    clearanceLevel: number,
  ) => void;
  onToggleStatus: (user: User) => void;
}) {
  const selectedRole =
    ["super_admin", "org_admin", "product_admin", "agent", "user"].find(
      (role) => user.roles.includes(role),
    ) ?? "user";
  const selectedProducts =
    user.productAccess?.map((access) => access.productKey) ?? [];

  return (
    <form
      className="p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onUpdateAccess(
          user,
          String(form.get("role")),
          form.getAll("productKeys") as ProductKey[],
          Number(form.get("clearanceLevel") || 0),
        );
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-strong)]">
            {user.name ?? user.email}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{user.email}</p>
        </div>
        <StatusPill status={user.isActive === false ? "inactive" : "active"} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[180px_130px_minmax(0,1fr)_auto_auto] xl:items-end">
        <Field label="Role">
          <select
            name="role"
            className="input"
            defaultValue={selectedRole}
            disabled={selectedRole === "super_admin"}
          >
            {selectedRole === "super_admin" ? (
              <option value="super_admin">Super Admin</option>
            ) : null}
            <option value="org_admin">Org Admin</option>
            <option value="product_admin">Product Admin</option>
            <option value="agent">Agent</option>
            <option value="user">User</option>
          </select>
        </Field>
        <Field label="Clearance">
          <select
            name="clearanceLevel"
            className="input"
            defaultValue={user.clearanceLevel ?? 0}
          >
            {[0, 1, 2, 3, 4].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Product access
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {productCatalog.map((product) => (
              <label
                key={product.key}
                className="flex items-center gap-2 text-xs text-[var(--text-base)]"
              >
                <input
                  type="checkbox"
                  name="productKeys"
                  value={product.key}
                  defaultChecked={selectedProducts.includes(product.key)}
                />
                {product.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="h-10 rounded-xl border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]">
          Save access
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus(user)}
          className="h-10 rounded-xl border border-[var(--border-strong)] px-3 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
        >
          {user.isActive === false ? "Activate" : "Deactivate"}
        </button>
      </div>
    </form>
  );
}

function UserModal({
  title,
  description,
  submitLabel,
  onClose,
  onSubmit,
  includePassword = false,
}: {
  title: string;
  description: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  includePassword?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
          >
            Close
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input name="name" className="input" required={includePassword} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className="input" required />
            </Field>
            {includePassword ? (
              <Field label="Temporary password">
                <input
                  name="password"
                  type="password"
                  className="input"
                  required
                  minLength={8}
                />
              </Field>
            ) : null}
            <Field label="Role">
              <select name="role" className="input" defaultValue="agent">
                <option value="org_admin">Org Admin</option>
                <option value="product_admin">Product Admin</option>
                <option value="agent">Agent</option>
                <option value="user">User</option>
              </select>
            </Field>
            <Field label="Clearance level">
              <select name="clearanceLevel" className="input" defaultValue="0">
                {[0, 1, 2, 3, 4].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 py-4">
            <legend className="px-1 text-sm font-medium text-[var(--text-base)]">
              Product access
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {productCatalog.map((product) => (
                <label
                  key={product.key}
                  className="flex items-center gap-2 text-sm text-[var(--text-base)]"
                >
                  <input type="checkbox" name="productKeys" value={product.key} />
                  {product.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--border-strong)] px-4 text-sm text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
            <button className="h-10 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)]">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryMiniCard({
  icon: Icon,
  label,
  value,
  isStatus = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  isStatus?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
            {label}
          </p>
          {isStatus ? (
            <div className="mt-3">
              <StatusPill status={value} />
            </div>
          ) : (
            <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
              {value}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-tint)] text-[var(--accent-primary)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm transition ${
        active
          ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-[var(--shadow-soft)]"
          : "border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text-base)]">
      <Icon className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
      {label}
    </span>
  );
}

function DetailBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[var(--accent-primary)]" /> : null}
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--text-strong)]">
        {value}
      </p>
    </div>
  );
}

function InsightRow({
  title,
  subtitle,
  detail,
}: {
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
        {subtitle}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function CenteredNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function formatValueLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeHeaders(headers?: RequestInit["headers"]) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

function parseRequestBody(body?: RequestInit["body"]) {
  if (!body || typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function handleAxiosResponse<T>(response: AxiosResponse<T>) {
  if (response.status >= 400) {
    const payload = response.data as { message?: string | string[] } | undefined;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}
