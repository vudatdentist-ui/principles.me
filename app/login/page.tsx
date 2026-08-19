import { Suspense } from "react";
import { InternalLogin } from "@/components/internal-login";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <InternalLogin next={params.next ?? null} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <Suspense fallback={<InternalLogin next={null} />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
