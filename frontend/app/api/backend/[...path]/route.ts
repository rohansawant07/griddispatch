import { NextRequest } from "next/server";
const allowed = new Set([
  "health",
  "demo/battery",
  "demo/forecast",
  "demo/baseline",
  "forecast/import",
  "optimize",
  "compare",
  "scenarios",
  "explain",
]);
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowed.has(path))
    return Response.json({ detail: "Unknown endpoint" }, { status: 404 });
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/${path}`,
      {
        method: request.method,
        headers: {
          "Content-Type":
            request.headers.get("content-type") || "application/json",
        },
        body:
          request.method === "GET" ? undefined : await request.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(240000),
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      {
        detail:
          "Backend unavailable. Start FastAPI on port 8000 or set BACKEND_URL.",
      },
      { status: 502 },
    );
  }
}
export { proxy as GET, proxy as POST };
