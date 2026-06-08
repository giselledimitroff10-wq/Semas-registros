// Función-proxy de Netlify para el Generador de Registros — Instituto SEMAS
//
// Qué hace:
//   1. Valida la clave de acceso (la que vos elegís y compartís con los psicólogos).
//   2. Recibe el prompt del navegador y llama a la API de Anthropic con TU clave secreta.
//   3. Devuelve solo el texto generado. Tu clave de Anthropic nunca llega al navegador.
//
// Variables de entorno que tenés que cargar en Netlify (Site settings > Environment variables):
//   ANTHROPIC_API_KEY  -> tu clave de console.anthropic.com (empieza con sk-ant-...)
//   ACCESS_KEY         -> la contraseña de acceso que vos inventás (ej: "semas2025")

exports.handler = async (event) => {
  // Solo aceptamos POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ACCESS_KEY = process.env.ACCESS_KEY || "";
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "JSON inválido" };
  }

  // --- Validación de la clave de acceso ---
  if (!ACCESS_KEY || body.key !== ACCESS_KEY) {
    return { statusCode: 401, body: "No autorizado" };
  }

  // El navegador solo está chequeando la clave (pantalla de acceso)
  if (body.check === true) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // --- Generación del registro ---
  if (!body.prompt) {
    return { statusCode: 400, body: "Falta el prompt" };
  }
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: "Falta configurar ANTHROPIC_API_KEY" };
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: body.prompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return { statusCode: 502, body: "Error de la API: " + errText };
    }

    const data = await r.json();
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
    return { statusCode: 500, body: "Error interno: " + String(e) };
  }
};
