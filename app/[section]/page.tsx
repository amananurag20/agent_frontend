import { notFound } from "next/navigation";
import Home from "../page";

const consoleSections = new Set([
  "dashboard",
  "organizations",
  "inbox",
  "knowledge",
  "appointments",
  "whatsapp",
  "voice",
  "widget",
  "users",
  "products",
  "ai-providers",
  "audit",
]);

export default async function ConsoleSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!consoleSections.has(section)) notFound();

  return <Home />;
}
