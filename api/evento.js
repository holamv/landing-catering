/**
 * Proxy server-side de EVENTOS: landing -> n8n.
 *
 * La landing avisa cada paso del visitante (view, cta_click, submit) a
 * POST /api/evento (mismo dominio, sin CORS) y esta funcion lo reenvia al
 * webhook de n8n, que lo guarda en la data table eventos_landing_cocinas.
 *
 * PROVISIONAL: es para las pruebas. Cuando la medicion este validada, esto
 * se muda al datalake y solo cambia la URL de aca; la landing no se entera.
 *
 * Es "dispara y olvida": si algo falla, se responde 204 igual. Medir nunca
 * puede romperle la experiencia a quien esta llenando el formulario.
 */

const WEBHOOK = process.env.EVENTOS_WEBHOOK_URL
  || 'https://n8n.manzanaverde.la/webhook/cocinas-evento';

const EVENTOS_VALIDOS = ['view', 'cta_click', 'submit'];

const PAIS_POR_OFICINA = {
  'lima': 'PE',
  'peru': 'PE',
  'perú': 'PE',
  'bogota': 'CO',
  'bogotá': 'CO',
  'colombia': 'CO',
  'ciudad de mexico': 'MX',
  'ciudad de méxico': 'MX',
  'mexico': 'MX',
  'méxico': 'MX',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const b = req.body || {};

  // Solo se aceptan los eventos conocidos: evita que un tercero infle la tabla
  // con basura si descubre la URL.
  if (!EVENTOS_VALIDOS.includes(b.event)) {
    return res.status(400).json({ error: 'evento_desconocido' });
  }

  const payload = {
    session_id: String(b.session_id || '').slice(0, 64),
    event: b.event,
    country: PAIS_POR_OFICINA[String(b.pais || '').toLowerCase().trim()] || '',
    channel: String(b.channel || 'directo').slice(0, 100),
    campaign: b.campaign ? String(b.campaign).slice(0, 100) : '',
  };

  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Se traga el error a proposito: medir no puede romper la landing.
  }

  return res.status(204).end();
}
