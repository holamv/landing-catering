# landings_catering

Landing de captación para el **Programa de Socios de Manzana Verde** (Colombia · México · Perú).
Réplica de la landing original, con el formulario reconectado a un Google Sheet propio.

## Estructura

```
landings_catering/
├── index.html            # La landing (un solo archivo, CSS/JS/imágenes inline)
├── apps-script/
│   └── Code.gs           # Web App de Google Apps Script que escribe en el Sheet
└── README.md
```

## ¿A dónde llegan los datos?

Campos que captura el formulario (todos obligatorios menos *Comentarios*):
`nombre, correo, telefono, pais, cargo, establecimiento, horario, direccion, zona, comentarios`

Hoy hay **dos destinos**:

1. **Google Sheet (ACTIVO — respaldo):** vía `fetch` GET `no-cors` a un **Google Apps Script**.
   https://docs.google.com/spreadsheets/d/1nhyk8wi_RUGe3QLnVhfpqIGHCB3y_cpSNLC6s9U3IZk/edit
   Una pestaña por país (`Perú`, `Colombia`, `México`; otro → `Otros`). Columnas:
   `Fecha | Nombre | Correo | Teléfono | País | Establecimiento | Horario | Dirección | Zona / Distrito | Comentarios | Cargo`

2. **Backend / BackOffice de leads (PREPARADO — pendiente de accesos):** ver sección siguiente.

## Flujo al backend (BackOffice)

El envío va por el **proxy server-side del propio proyecto**: `enviar()` hace POST a `/api/lead`
(misma URL de la landing, sin CORS) y `api/lead.js` reenvía al BackOffice
(`POST /api/3.0/catering/leads`) con la API key leída de la variable de entorno
`BACKOFFICE_LEADS_KEY` (Vercel → Project Settings → Environment Variables). Si la clave no está
configurada, el proxy responde 503 y el lead queda igual en el Sheet de respaldo.

Mapeo landing → columnas del BackOffice:

| Landing | BackOffice | Nota |
|---|---|---|
| `nombre` | NOMBRE | |
| `correo` | EMAIL | |
| `telefono` | TELÉFONO | |
| `establecimiento` | CATERING | |
| `zona` | DISTRITO | |
| `direccion` | DIRECCIÓN | |
| `cargo` | CARGO | **campo agregado** al form (dropdown Dueño/Administrador/Otro) |
| `pais` → ciudad | OFICINA | Perú=**Lima** (confirmado); CO=**Bogotá**, MX=**Ciudad de México** ⟵ *pendiente confirmar* |
| `comentarios` (+`horario`) | MENSAJE | el BackOffice **no tiene** columna Horario → se anexa al mensaje |
| *(auto)* | FECHA | la pone el backend |

### Para activarlo (2 pasos)
1. **Deploy del endpoint en el BackOffice** — `POST /api/3.0/catering/leads` ya está escrito en el
   repo del Backoffice (controller `V3\Catering\CreateCateringLeadController`, middleware dedicado
   `catering.leads.api` con header `X-Catering-Leads-Key`, clave en `CATERING_LEADS_API_KEY`);
   falta que Tech lo revise, genere la clave y lo suba.
2. **Configurar `BACKOFFICE_LEADS_KEY` en Vercel** con esa misma clave, y redeploy.

El resto ya quedó resuelto: URL y nombres de campos definidos, la clave va server-side en el proxy
(`api/lead.js`) y no hay CORS porque el POST es al mismo dominio.
*(Nota: para que el Sheet capture también `Cargo`, hay que re-desplegar `apps-script/Code.gs`, que ya tiene la columna.)*

## Puesta en marcha (paso único pendiente)

El despliegue del Apps Script debe hacerse desde la cuenta de Google dueña del Sheet:

1. Abre <https://script.google.com> → **Nuevo proyecto**.
2. Pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs).
3. (Opcional) Ejecuta `initSheets()` una vez para crear las 3 pestañas con encabezados desde ya.
4. **Implementar → Nueva implementación → Aplicación web**
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
5. Copia la URL que termina en `/exec`.
6. En [`index.html`](index.html) reemplaza las **2** apariciones de
   `REEMPLAZA_CON_TU_DEPLOYMENT_ID` por el ID de tu despliegue
   (la parte entre `/macros/s/` y `/exec`).

## Probar localmente

El país ya **no** se autodetecta por IP: se define por la **ruta** (`/pe`, `/co`, `/mx`;
respaldo `?pais=co`; raíz → Perú). En Vercel eso lo resuelve `vercel.json`. También se
puede cambiar manualmente en el selector con banderas del formulario.

## Notas

- Se eliminó el script `email-decode.min.js` que Cloudflare inyectaba en el original (no era parte del código).
- El modal **"Cómo funciona"** del original estaba truncado (el archivo desplegado cortaba a mitad del paso 2); aquí se completó con los 4 pasos.
