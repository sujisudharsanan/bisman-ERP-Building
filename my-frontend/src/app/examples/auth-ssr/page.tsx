import type { GetServerSidePropsContext } from 'next';

export const dynamic = 'force-dynamic';

export default async function Page(_: any) {
  // SSR fetch using the server runtime and forwarding cookies
  // In app router, you can access headers() and cookies() too, but here we
  // demonstrate calling the Next API route which already proxies cookies.
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/me`, {
    cache: 'no-store',
    headers: {},
  });
  const data = await res.json().catch(() => null);
  return (
    <pre className="p-4 text-sm">{JSON.stringify(data, null, 2)}</pre>
  );
}
