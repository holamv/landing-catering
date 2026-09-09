/**
 * Proxy server-side de EVENTOS: landing de cocinas -> datalake.
 *
 * La landing avisa cada paso del visitante a POST /api/evento (mismo dominio, sin
 * CORS) y esta funcion lo escribe en adquisicion.eventos_landing del datalake, a
 * traves del RPC restringido. La clave de escritura vive en las variables de
 * Vercel y nunca llega al navegador.
 *
 * Embudo que se mide:
 *   view           entro a la pagina
 *   form_visible   llego hasta el formulario (lo tuvo en pantalla)
 *   form_start     toco el primer campo
 *   cta_click      hizo clic en un boton que lleva al formulario
 *   submit_blocked intento enviar y se trabo (detail = campos que fallaron)
 *   submit         envio con el formulario valido
 *   lead_ok        el BackOffice confirmo el guardado (lo manda api/lead.js)
 *
 * Es "dispara y olvida": si el datalake falla, se responde 204 igual. Medir nunca
 * puede romperle la experiencia a quien esta llenando el formulario.
 */

import { registrarEvento, LANDING_COCINAS } from './_datalake.js';

const PAIS_POR_OFICINA = {
  'lima': 'PE',
  'peru': 'PE',
  'perú': 'PE',
  'piura': 'PE',
  'bogota': 'CO',
  'bogotá': 'CO',
  'colombia': 'CO',
  'ciudad de mexico': 'MX',
  'ciudad de méxico': 'MX',
  'guadalajara': 'MX',
  'monterrey': 'MX',
  'mexico': 'MX',
  'méxico': 'MX',
};

// Los eventos que la landing puede mandar. El datalake tiene su propio catalogo y
// rechaza lo que no reconoce: esta lista evita el viaje de ida y vuelta.
const EVENTOS_VALIDOS = [
  'view', 'form_visible', 'form_start', 'cta_click',
  'submit_blocked', 'submit', 'lead_ok',
];

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

  const ciudad = String(b.pais || '').trim();

  try {
    await registrarEvento({
      landing: LANDING_COCINAS,
      session_id: b.session_id,
      event: b.event,
      // La landing manda en 'pais' la ciudad elegida (Lima, Bogota...). Hasta que
      // la persona elige, no se sabe el pais: se deja vacio en vez de asumir Peru.
      country: PAIS_POR_OFICINA[ciudad.toLowerCase()] || null,
      city: ciudad || null,
      channel: b.channel || 'directo',
      medium: b.medium,
      campaign: b.campaign,
      content: b.content,
      term: b.term,
      device: b.device,
      detail: b.detail,
      is_test: b.channel === 'prueba',
    });
  } catch (e) {
    // Se traga el error a proposito: medir no puede romper la landing.
  }

  return res.status(204).end();
}
