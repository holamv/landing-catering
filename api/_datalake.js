/**
 * Cliente del datalake para las landings de captacion.
 *
 * Escribe en adquisicion.eventos_landing y adquisicion.leads_landing a traves de
 * dos RPC restringidos. La LANDING_WRITER_KEY solo habilita INSERT en esas dos
 * tablas: sin SELECT, sin UPDATE, sin DELETE y sin acceso a nada mas del datalake.
 * Contrato completo en docs/ADQUISICION_LANDINGS.md del repo del datalake.
 *
 * Es "dispara y olvida": medir nunca puede romperle el envio a quien esta llenando
 * el formulario. Si el datalake no responde, el lead igual llega a su destino.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WRITER_KEY = process.env.LANDING_WRITER_KEY;

const EVENTOS_VALIDOS = [
  'view', 'form_visible', 'cta_click', 'form_start',
  'submit', 'submit_blocked', 'lead_ok', 'app_click', 'wa_click', 'consulta',
];

const DISPOSITIVOS_VALIDOS = ['movil', 'escritorio'];

function estaConfigurado() {
  return Boolean(SUPABASE_URL && ANON_KEY && WRITER_KEY);
}

function limpiar(valor, largo) {
  if (valor === null || valor === undefined || valor === '') return null;
  return String(valor).slice(0, largo || 200);
}

async function llamarRpc(funcion, cuerpo) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcion}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => '');
    throw new Error(`${funcion} respondio ${r.status}: ${detalle.slice(0, 300)}`);
  }
  return r.json().catch(() => null);
}

export async function registrarEvento(evento) {
  if (!estaConfigurado()) return null;
  if (!EVENTOS_VALIDOS.includes(evento.event)) {
    throw new Error(`evento desconocido: ${evento.event}`);
  }
  return llamarRpc('adq_landing_evento', {
    p_key: WRITER_KEY,
    p_evento: {
      landing: evento.landing,
      session_id: limpiar(evento.session_id, 64),
      event: evento.event,
      country: limpiar(evento.country, 4),
      city: limpiar(evento.city, 60),
      channel: limpiar(evento.channel, 60),
      medium: limpiar(evento.medium, 60),
      campaign: limpiar(evento.campaign, 100),
      content: limpiar(evento.content, 100),
      term: limpiar(evento.term, 100),
      device: DISPOSITIVOS_VALIDOS.includes(evento.device) ? evento.device : null,
      detail: limpiar(evento.detail, 200),
      is_test: Boolean(evento.is_test),
    },
  });
}

export async function registrarLead(lead) {
  if (!estaConfigurado()) return null;
  return llamarRpc('adq_landing_lead', {
    p_key: WRITER_KEY,
    p_lead: {
      landing: lead.landing,
      session_id: limpiar(lead.session_id, 64),
      full_name: limpiar(lead.full_name, 150),
      phone: limpiar(lead.phone, 30),
      email: limpiar(lead.email, 150),
      country: limpiar(lead.country, 4),
      city: limpiar(lead.city, 60),
      district: limpiar(lead.district, 120),
      address: limpiar(lead.address, 300),
      business_name: limpiar(lead.business_name, 150),
      position: limpiar(lead.position, 100),
      message: limpiar(lead.message, 1000),
      zones: limpiar(lead.zones, 300),
      vehicle: limpiar(lead.vehicle, 20),
      has_bag: typeof lead.has_bag === 'boolean' ? lead.has_bag : null,
      qualified: typeof lead.qualified === 'boolean' ? lead.qualified : null,
      channel: limpiar(lead.channel, 60),
      medium: limpiar(lead.medium, 60),
      campaign: limpiar(lead.campaign, 100),
      content: limpiar(lead.content, 100),
      term: limpiar(lead.term, 100),
      device: DISPOSITIVOS_VALIDOS.includes(lead.device) ? lead.device : null,
      backend_status: limpiar(lead.backend_status, 30),
      is_test: Boolean(lead.is_test),
    },
  });
}

export const LANDING_COCINAS = 'cocinas_socias';
export const LANDING_REPARTIDORES = 'repartidores';
