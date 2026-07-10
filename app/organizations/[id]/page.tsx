import { OrganizationDetailsPage } from "@/components/organization-details-page";

export default async function OrganizationRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizationDetailsPage organizationId={id} />;
}
