// Función-proxy de Netlify para el Generador de Registros — Instituto SEMAS
// Variables de entorno necesarias en Netlify:
//   ANTHROPIC_API_KEY  -> clave de console.anthropic.com (sk-ant-...)
//   ACCESS_KEY         -> contraseña de acceso para los psicólogos

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ACCESS_KEY = process.env.ACCESS_KEY || "";
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  // Validación de la clave de acceso
  if (!ACCESS_KEY || body.key !== ACCESS_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: "No autorizado" }) };
  }

  // Solo chequeo de clave (pantalla de acceso)
  if (body.check === true) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (!body.prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta el prompt" }) };
  }
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 200, body: JSON.stringify({ error: "Falta configurar ANTHROPIC_API_KEY en Netlify" }) };
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: body.prompt }],
      }),
    });

    const raw = await r.text();

    // Si Anthropic devolvió un error, lo pasamos legible al navegador (status 200 para que el front lo lea)
    if (!r.ok) {
      let detalle = raw;
      try { detalle = JSON.parse(raw).error?.message || raw; } catch {}
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Anthropic respondió " + r.status + ": " + detalle }),
      };
    }

    const data = JSON.parse(raw);
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno: " + String(e) }),
    };
  }
};
