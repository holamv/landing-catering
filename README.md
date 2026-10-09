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

El envío va por **un solo camino**: el proxy server-side `api/lead.js` (ver "Flujo al backend"
más abajo), que escribe en **dos destinos**:

1. **Backend / BackOffice de leads (ACTIVO, el único obligatorio):** ver sección siguiente.
2. **Datalake (espejo, para reportes):** cada lead y el evento `lead_ok` se mandan también a
   `adquisicion.leads_landing` / `adquisicion.eventos_landing` vía `api/_datalake.js`. Es
   "dispara y olvida": si el datalake no responde, el lead igual llega al BackOffice sin que
   la persona que llena el formulario note nada.

El Google Sheet y `apps-script/Code.gs` (sección "Puesta en marcha" más abajo) son de una
versión anterior de esta landing: el `index.html` actual no les manda nada. Se dejan en el
repo solo como referencia histórica.

## ⚠️ Reglas que no se tocan

**1. El aviso de error NUNCA limpia el formulario.**
Se retiro el Google Sheet de respaldo: el BackOffice es el unico destino. Un rechazo no es
un reintento, es una cocina socia perdida. Si ademas se le borra lo que escribio, no vuelve
a llenar diez campos. El camino de error solo marca los campos, avisa y reactiva el boton
(ver `mostrarFalloEnvio` en `index.html`). Si alguna vez se agrega un "limpiar formulario",
va en el camino de EXITO, nunca en el de error.

**2. El texto de error de la API no se muestra.**
La API responde en ingles. La landing usa solo las CLAVES de `errors` (`email`, `city`,
`phone`...) para saber que campo marcar, y muestra la copia en espanol que ya vive en cada
`.fg-error-msg`. El mapeo esta en `CAMPO_POR_CLAVE` (`index.html`).

**3. 200 y 201 son lo mismo: el lead se guardo.**
El 201 es un lead nuevo; el 200 avisa que ese correo ya habia entrado hoy. Tratar el 200
como error mostraria una falla donde no la hubo. La landing usa `r.ok`, que cubre los dos.

**4. Formato de los campos.**
`country` va como texto (`PE`/`CO`/`MX`), nunca un numero. `position` va la etiqueta
(`Dueño`), nunca un id: si se manda `1`, Operaciones lee "1" en la columna Cargo.
`city` tiene que ser una de las seis oficinas: Lima, Piura, Bogota, Ciudad de Mexico,
Guadalajara, Monterrey.

## Estado del endpoint

El endpoint del BackOffice (`POST /api/3.0/catering/leads`) ya está desplegado en producción, con
`CATERING_LEADS_API_KEY` configurada en ambos lados (Vercel y el servidor). Los leads de esta
landing ya llegan al BackOffice.

## Flujo al backend (BackOffice)

El envío va por el **proxy server-side del propio proyecto**: `enviar()` hace POST a `/api/lead`
(misma URL de la landing, sin CORS) y `api/lead.js` reenvía al BackOffice
(`POST /api/3.0/catering/leads`) con la API key leída de la variable de entorno
`CATERING_LEADS_API_KEY` (Vercel → Project Settings → Environment Variables). Si la clave no está
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

### Cómo quedó activado

`POST /api/3.0/catering/leads` vive en el repo del Backoffice (controller
`V3\Catering\CreateCateringLeadController`, middleware dedicado `catering.leads.api` con header
`X-Catering-Leads-Key`, clave en `CATERING_LEADS_API_KEY`). La misma clave está configurada en
Vercel (proxy `api/lead.js`, server-side, sin CORS porque el POST es al mismo dominio) y en el
servidor del BackOffice.

**Pendiente de confirmar:** el mapeo de `pais` → `OFICINA` para Colombia (Bogotá) y México (Ciudad
de México) — ver tabla arriba.

## Puesta en marcha del Apps Script (legado, ya no aplica)

Esta sección describe cómo desplegar `apps-script/Code.gs` para el Google Sheet de respaldo de
una versión anterior. El `index.html` actual no llama a este script, así que estos pasos **no
son necesarios** para que los leads lleguen al BackOffice. Se dejan documentados solo por si el
Sheet vuelve a usarse en el futuro.

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
