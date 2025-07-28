# 🤖 Midas Bot (v1.3)

Microservicio modular en Node.js + Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Ahora con arquitectura handler-based, healthcheck, middleware de errores y configuración centralizada en `config.js`.

Incluye **normalización de nombres** mediante un diccionario de más de 1000 variantes hispanas (`nameDictionary.js`) y funciones de formato (`nameUtils.js`).

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
│   ├── nameDictionary.js ← Diccionario inteligente de nombres (1000+ entradas)
│   └── nameUtils.js ← Funciones para normalizar nombre y apellido
├── config.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose-dev.yml
└── docker-compose.yml
```

---

## 🚀 Endpoints

### `GET /health`  
Comprueba que el servicio está arriba y funcionando:

```bash
curl http://<HOST>:4000/health
# → { "status": "ok" }
```

### `POST /bot/etapa`  
Flujo principal de procesamiento de etapa o mensaje directo. Requiere un payload mínimo como:

```bash
curl -X POST "http://104.236.36.75:4001/bot/etapa" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2",
    "nombre": "uan LUIS",
    "apellido": "PÉREZ GÓMEZ",
    "telefono": "+59179790873",
    "email": "test2@example.com",
    "etapa": "dunn",
    "pais": "Bolivia",
    "ciudad": "Cochabamba",
    "zona_horaria": "America/La_Paz",
    "instancia_evolution_api": "prueba",
    "dominio": "prueba.com"
  }'
```

> Si el payload incluye `"mensaje": "..."`, se omite la etapa y se devuelve solo el HTML interpolado.

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "imagen_base64_puro": "<Base64>",
    "texto_html": "🌸 Hola Juan Luis, tu sesión está confirmada...",
    "audio_base64_puro": "<Base64>",
    "payload_original": { /* JSON enriquecido con dia_legible, hora_legible, enlaces acortados… */ }
  }
}
```

---

## ✨ Normalización de nombres

Gracias al archivo `utils/nameDictionary.js` y las funciones de `utils/nameUtils.js`, el bot ahora puede:

- Detectar errores comunes como `luiz → Luis`, `mria → María`, `juanluis → Juan Luis`.
- Corregir tildes, espacios y mayúsculas.
- Capitalizar correctamente nombres y apellidos, incluso si vienen mal escritos.

### Ejemplo:

```js
normalizeName('luiz') // → 'Luis'
normalizeName('mariajose') // → 'María José'
normalizeSurname('pérez gómez') // → 'Pérez Gómez'
```

---

## ⚙️ Dependencias principales

- Node.js 18+
- Express
- moment-timezone (idioma ES)
- mysql2 (MySQL async)
- @aws-sdk/client-s3 (MinIO)
- ffmpeg-static + fluent-ffmpeg
- axios + form-data
- uuid
- dotenv

---

## 🐳 Despliegue

### Desarrollo (Docker Compose)

```bash
docker-compose -f docker-compose-dev.yml up -d --build
```

- Expone el servicio en el puerto `4001`.
- Usa tu directorio local como volumen para desarrollo en caliente.

### Producción (Docker Compose/Traefik)

```bash
docker-compose up -d --build
```

- Expone el servicio en el puerto `4000`.
- Definido en `docker-compose.yml` junto a etiquetas de Traefik.

---

## 🔐 Variables de entorno

```env
# Puerto de la API
PORT=4001

# MinIO
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_REGION=
MINIO_FORCE_PATH_STYLE=true

# MySQL (WordPress)
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
```

---

## 📝 Notas

- Modularización clara: cada paso vive en su propio handler.
- Configuración centralizada (`config.js`).
- Middleware global de errores (`errorHandler.js`).
- Detección y cache de URLs ya acortadas.
- Logs con contexto.
- nameUtils + nameDictionary mejoran la personalización en respuestas TTS/HTML.

---

## 📞 Contacto

Proyecto desarrollado por **Kurukin**  
Soporte técnico: **Javier Quiroz**