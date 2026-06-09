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

El formulario envía (vía `fetch` GET `no-cors`) los campos:
`nombre, correo, telefono, pais, establecimiento, horario, direccion, zona, comentarios`
a un **Google Apps Script** que los escribe en este Sheet:

https://docs.google.com/spreadsheets/d/1nhyk8wi_RUGe3QLnVhfpqIGHCB3y_cpSNLC6s9U3IZk/edit

**Distinción por país:** cada envío cae en una pestaña según el país detectado
(`Perú`, `Colombia`, `México`; cualquier otro → `Otros`). Columnas:

`Fecha | Nombre | Correo | Teléfono | País | Establecimiento | Horario | Dirección | Zona / Distrito | Comentarios`

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

Abre `index.html` en el navegador (doble clic). El país se autodetecta por IP
(`ipapi.co`); también se puede cambiar manualmente en el selector con banderas.

## Notas

- Se eliminó el script `email-decode.min.js` que Cloudflare inyectaba en el original (no era parte del código).
- El modal **"Cómo funciona"** del original estaba truncado (el archivo desplegado cortaba a mitad del paso 2); aquí se completó con los 4 pasos.
