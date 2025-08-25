export const config = { runtime: "edge" };

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }
  try {
    const upstream = await fetch(target, {
      headers: { "cache-control": "no-cache" }
    });
    if (!upstream.ok) {
      return new Response(`Upstream error (${upstream.status})`, { status: 502 });
    }
    const body = await upstream.text();
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "public, s-maxage=300, stale-while-revalidate=86400"
      }
    });
  } catch {
    return new Response("Fetch failed", { status: 500 });
  }
}
