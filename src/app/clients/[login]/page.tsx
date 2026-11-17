import { notFound } from "next/navigation";
import { CLIENTS, findClient } from "@/lib/data";
import { ClientView } from "./view";

export function generateStaticParams() {
  return CLIENTS.map((c) => ({ login: String(c.login) }));
}

export default async function Page({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const c = findClient(Number(login));
  if (!c) notFound();
  return <ClientView c={c} />;
}
