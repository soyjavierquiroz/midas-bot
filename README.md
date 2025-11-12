# 🤖 Midas Bot (v1.3.1)

Microservicio modular en **Node.js + Express** que:
- Guarda/actualiza leads (store-only).
- Procesa “etapas”: devuelve **HTML**, **imagen** (MinIO) y **audio** (TTS ElevenLabs + fusión con audio base).
- Normaliza nombre y apellido (diccionario + utilidades).
- Acorta enlaces con **YOURLS**.

Incluye:
- Arquitectura **handler-based**
- Healthcheck (`/health`)
- Middleware global de errores
- Config centralizada en `config.js`
- **Override de HTML** desde el payload con `texto_html`
- **Control de velocidad TTS** con `voice_speed`
- Opción para **desactivar TTS** con `TTS_DISABLED=1`

---

## 🧱 Estructura general

```

midas-bot/
├── controllers/
│   ├── botController.js
│   └── handlers/
│       ├── preprocessPayload.js
│       ├── acortarLinks.js
│       ├── handleMensaje.js
│       ├── handleEtapa.js
│       └── sendResponse.js
├── middlewares/
│   └── errorHandler.js
├── routes/
│   ├── botRoutes.js
│   └── testRoutes.js
├── services/
│   ├── dbService.js
│   ├── leadService.js
│   ├── etapaService.js
│   ├── fusionService.js
│   ├── minioService.js
│   └── ttsService.js
├── utils/
│   ├── textUtils.js
│   ├── urlShortener.js
│   ├── nameDictionary.js   ← Diccionario 1000+ nombres latinos
│   └── nameUtils.js        ← Normalización de nombres/apellidos
├── config.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose-dev.yml  ← DEV (puerto 4001)
└── docker-compose.yml      ← PROD (puerto 4000)

````

---

## 🚀 Endpoints

### `GET /health`
Comprobación rápida del servicio.

**DEV**
```bash
curl http://104.236.36.75:4001/health
# → { "status": "ok" }
````

**PROD**

```bash
curl http://104.236.36.75:4000/health
# → { "status": "ok" }
```

---

### `POST /bot/lead` — Store-only (guardar/actualizar lead)

Guarda o actualiza un lead **sin generar TTS ni imagen**.
Usa upsert con clave única compuesta: `(user_id, telefono, instancia_evolution_api, dominio)`.

**Campos mínimos:** `user_id`, `telefono`, `instancia_evolution_api`
**Opcionales:** `dominio` (si falta se intenta inferir de `link/meet/zoom`), `nombre`, `apellido`, `email`, `ciudad`, `pais`, `zona_horaria`, `fecha`, etc.

**DEV**

```bash
curl -X POST "http://104.236.36.75:4001/bot/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 6,
    "telefono": "+59179790000",
    "instancia_evolution_api": "tbs-lapaz",
    "dominio": "inscripciones.tbs.edu.bo",
    "nombre": "JAVIER",
    "apellido": "QUIROZ",
    "email": "javier@example.com",
    "ciudad": "Cochabamba",
    "pais": "Bolivia",
    "zona_horaria": "America/La_Paz"
  }'
```

**Respuesta**

```json
{ "success": true, "data": { "lead_id": 123, "user_id": 6, "isNew": false, "mode": "store_only" } }
```

---

### `GET /bot/lead` — Consulta por teléfono + instancia

Verifica si un lead existe y trae sus datos.

**DEV**

```bash
curl -s "http://104.236.36.75:4001/bot/lead?telefono=%2B59179790000&instancia_evolution_api=tbs-lapaz"
```

**Respuesta 200**

```json
{ "success": true, "data": { "lead_id": 123, "user_id": 6, "nombre": "Javier", "...": "..." } }
```

**Respuesta 404**

```json
{ "success": false, "error": "Lead no encontrado" }
```

---

### `POST /bot/etapa` — Proceso completo

Flujo: **upsert lead → etapa → acortar enlaces → HTML → TTS + fusión → imagen**.
Si envías `texto_html` en el payload, **se usa tu HTML** en lugar del de la BD.

**DEV**

```bash
curl -X POST "http://104.236.36.75:4001/bot/etapa" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 6,
    "telefono": "+59179790000",
    "instancia_evolution_api": "tbs-lapaz",
    "dominio": "inscripciones.tbs.edu.bo",
    "etapa": "lapaz_parvulario",
    "nombre": "JAVIER",
    "apellido": "QUIROZ",
    "zona_horaria": "America/La_Paz",
    "fecha": "2025-06-20 15:30:00",
    "link": "https://kuruk.in/tbs-reserva",
    "link_enviar": "1",
    "link_acortar": "1"
  }'
```

**Solo guardar con el mismo endpoint (opcional)**

```bash
curl -X POST "http://104.236.36.75:4001/bot/etapa?only=save" \
  -H "Content-Type: application/json" \
  -d '{"user_id":6,"telefono":"+59179790000","instancia_evolution_api":"tbs-lapaz","dominio":"inscripciones.tbs.edu.bo"}'
```

**Respuesta (flujo completo)**

```json
{
  "success": true,
  "data": {
    "imagen_base64_puro": "...",
    "texto_html": "Hola Javier, ...",
    "audio_base64_puro": "...",
    "payload_original": { ... }
  }
}
```

---

## ✨ Normalización de nombres

* `utils/nameDictionary.js`: catálogo 1000+ nombres latinos (variantes comunes).
* `utils/nameUtils.js`: capitalización, compuestos, tildes, espacios.

**Ejemplos**

```js
normalizeName('maria DEL Carmen')  // → 'María del Carmen'
normalizeName('LUISangel')         // → 'Luis Ángel'
normalizeSurname('perez GÓmez')    // → 'Pérez Gómez'
```

---

## 🎧 TTS (ElevenLabs) y fusión

* `services/ttsService.js` → genera audio TTS (`generarAudioTTS`).
* `services/fusionService.js` → fusiona TTS + audio base (ffmpeg).
* `services/minioService.js` → obtiene audio base aleatorio y la imagen desde MinIO.

**Velocidad TTS**: enviar `voice_speed` en la config de usuario (BD) o en payload para override.
**Desactivar TTS**: `TTS_DISABLED=1` salta la generación y fusión (sigue devolviendo HTML e imagen).

---

## 🗄️ Tablas usadas

* `wa_bot_leads`: lead maestro. **Índice único recomendado**: `(user_id, telefono, instancia_evolution_api, dominio)`.
* `wa_bot_lead_stages`: historial de etapas por lead.
* `wa_bot_etapas`: contenidos (textos/textos_html) por `user_id` y `nombre` (etapa).
* `wa_bot_config`: parámetros TTS por usuario (`eleven_api_key`, `voice_id`, `model_id`, `stability`, `similarity_boost`, `style`, `speaker_boost`, `voice_speed`).

---

## 🔐 Variables de entorno (resumen)

```env
# API
PORT=4001

# MinIO
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_REGION=
MINIO_FORCE_PATH_STYLE=true

# MySQL
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

# YOURLS
YOURLS_API=
YOURLS_SIGNATURE=

# ElevenLabs TTS
ELEVEN_API_KEY=
ELEVEN_VOICE_ID=
ELEVEN_MODEL_ID=
TTS_STABILITY=0.5
TTS_SIMILARITY_BOOST=0.7
TTS_STYLE=0.8
TTS_USE_SPEAKER_BOOST=true
TTS_SPEED=1.0          # ← opcional (voice_speed por env)

# Desactivar TTS temporalmente
TTS_DISABLED=0         # ← poner 1 para saltar TTS
```

---

## 🐳 Despliegue

**Desarrollo (puerto 4001)**

```bash
docker-compose -f docker-compose-dev.yml up -d --build
```

**Producción (puerto 4000)**

```bash
docker-compose up -d --build
```

> En producción, `docker-compose.yml` incluye labels para Traefik (si aplica).

---

## 📝 Notas

* Rutas clave:

  * `POST /bot/lead` → **solo guardar/actualizar**
  * `GET /bot/lead` → **consulta** por teléfono + instancia
  * `POST /bot/etapa` → **flujo completo** (guardar/actualizar + etapa + TTS + imagen)
* `texto_html` en payload **sobrescribe** el HTML de la etapa en BD.
* Manejo de URLs: cache de duplicados y fallback GET en YOURLS.
* Logs detallados para diagnóstico en Portainer/Swarm.

---

## 📞 Contacto

Proyecto **Kurukin** – Desarrollado por **Javier Quiroz**