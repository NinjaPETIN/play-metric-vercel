import { teamLogoUrl } from '../../../../../lib/team-logo-url';

export async function GET(_request: Request, { params }: { params: Promise<{ team: string }> }) {
 const { team } = await params;
 const url = /^[A-Z]{3}$/.test(team) ? teamLogoUrl(team) : '';
 if (!url) return new Response(null, { status: 404 });
 try {
  const upstream = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
  if (!upstream.ok || !upstream.headers.get('content-type')?.startsWith('image/svg+xml')) {
   return new Response(null, { status: 404 });
  }
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > 250_000) return new Response(null, { status: 413 });
  return new Response(bytes, { headers: {
   'Content-Type': 'image/svg+xml',
   'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
   'X-Content-Type-Options': 'nosniff',
   'Cache-Control': 'public, max-age=86400',
  } });
 } catch {
  return new Response(null, { status: 503 });
 }
}
