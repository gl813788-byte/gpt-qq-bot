export function sendJson(res, code, body) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders()
  });
  res.end(JSON.stringify(body, null, 2));
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
