/**
 * Proxy server-side: landing -> BackOffice.
 *
 * La landing hace POST /api/lead (mismo dominio, sin CORS) y esta funcion
 * reenvia el lead a POST /api/3.0/catering/leads del BackOffice con la clave
 * DEDICADA de este endpoint en el header X-Catering-Leads-Key. La clave vive
 * en la variable de entorno BACKOFFICE_LEADS_KEY (Vercel -> Project Settings
 * -> Environment Variables), nunca en el navegador.
 *
 * Si la clave no esta configurada responde 503 y no pasa nada: el Google
 * Sheet sigue guardando cada lead como respaldo, en paralelo.
 */

// La landing manda el pais en texto; el BackOffice espera el codigo.
// Se listan las variantes con y sin tilde para no depender de normalizar acentos.
const CODIGO_PAIS = {
  'peru': 'PE',
  'perú': 'PE',
  'colombia': 'CO',
  'mexico': 'MX',
  'méxico': 'MX',
};

// Ciudades donde MV opera. Son las oficinas del BackOffice: si llega una que
// no esta en esta lista, no hay a que oficina mandar el lead.
const CIUDADES = {
  'lima': 'Lima',
  'piura': 'Piura',
  'bogota': 'Bogotá',
  'bogotá': 'Bogotá',
  'ciudad de mexico': 'Ciudad de México',
  'ciudad de méxico': 'Ciudad de México',
  'guadalajara': 'Guadalajara',
  'monterrey': 'Monterrey',
};

function normalizar(texto) {
  return String(texto || '').toLowerCase().trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Solo POST' });
  }

  const key = process.env.BACKOFFICE_LEADS_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Falta BACKOFFICE_LEADS_KEY en las variables de entorno de Vercel',
    });
  }

  const b = req.body || {};

  // Los mismos obligatorios que marca el formulario con asterisco. Se validan
  // aca tambien porque la validacion del navegador es una sugerencia, no una
  // barrera, y desde que el Sheet salio no hay red de seguridad: un lead
  // rechazado por el BackOffice es una cocina perdida.
  const faltantes = ['nombre', 'email', 'telefono', 'catering', 'cargo', 'pais', 'ciudad', 'distrito', 'direccion', 'horario']
    .filter((campo) => !b[campo] || String(b[campo]).trim() === '');
  if (faltantes.length) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Faltan campos obligatorios',
      details: faltantes,
    });
  }

  const country = CODIGO_PAIS[normalizar(b.pais)];
  if (!country) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'País desconocido: ' + b.pais,
      details: ['pais debe ser Perú, Colombia o México'],
    });
  }

  const city = CIUDADES[normalizar(b.ciudad)];
  if (!city) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Ciudad sin operación: ' + b.ciudad,
      details: ['ciudad debe ser una donde MV opera: ' + Object.values(CIUDADES).filter((v, i, a) => a.indexOf(v) === i).join(', ')],
    });
  }

  const lead = {
    name: b.nombre,
    catering_name: b.catering,
    position: b.cargo,
    phone: b.telefono,
    email: b.email,
    country: country,
    city: city,
    district: b.distrito,
    direction: b.direccion,
    schedule: b.horario,
    message: b.mensaje || '',
  };

  const base = process.env.BACKOFFICE_URL || 'https://backend.manzanaverde.la';

  try {
    const r = await fetch(base + '/api/3.0/catering/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Catering-Leads-Key': key,
      },
      body: JSON.stringify(lead),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({
      error: 'backoffice_error',
      message: 'No se pudo contactar al BackOffice: ' + (e && e.message ? e.message : 'error de red'),
    });
  }
}
