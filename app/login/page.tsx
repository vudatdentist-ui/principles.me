import { InternalLogin } from "@/components/internal-login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <InternalLogin next={params.next ?? null} />;
}
