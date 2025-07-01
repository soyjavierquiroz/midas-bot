# 🤖 Midas Bot (v1.2)

Microservicio modular en Node.js + Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Ahora con arquitectura handler-based, healthcheck, middleware de errores y configuración centralizada en `config.js`.

---

## 🧱 Estructura general

midas-bot/
├── controllers/
│ ├── botController.js
│ └── handlers/
│ ├── preprocessPayload.js
│ ├── acortarLinks.js
│ ├── handleMensaje.js
│ ├── handleEtapa.js
│ └── sendResponse.js
├── middlewares/
│ └── errorHandler.js
├── routes/
│ ├── botRoutes.js
│ └── testRoutes.js
├── services/
│ ├── dbService.js
│ ├── leadService.js
│ ├── etapaService.js
│ ├── fusionService.js
│ ├── minioService.js
│ └── ttsService.js
├── utils/
│ ├── textUtils.js
│ └── urlShortener.js
├── config.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose-dev.yml
└── docker-compose.yml


---

## 🚀 Endpoints

### `GET /health`  
Comprueba que el servicio está arriba y funcionando:

```bash
curl http://<HOST>:4000/health
# → { "status": "ok" }

POST /bot/etapa

Flujo principal de procesamiento de etapa o mensaje directo:

curl -X POST http://<HOST>:4000/bot/etapa \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2",
    "nombre": "Sasha",
    "apellido": "Quiroz",
    "telefono": "+59179790873",
    "email": "sasha@example.com",
    "ciudad": "Cochabamba",
    "pais": "Bolivia",
    "zona_horaria": "America/La_Paz",
    "fecha": "2025-06-20 15:30:00",
    "zoom": "https://us02web.zoom.us/…",
    "meet": "https://meet.google.com/…",
    "link": "https://example.com/?code={codigo}",
    "link_slug": "evento",
    "etapa": "dunn",
    "instancia_evolution_api": "quiroz",
    "GMT": "0"
  }'

    Si el payload incluye "mensaje": "..."
    se omite la etapa y se devuelve solo el HTML interpolado.

Respuesta esperada:

{
  "success": true,
  "data": {
    "imagen_base64_puro": "<Base64>",
    "texto_html": "🌸 Hola Sasha, tu sesión está confirmada...",
    "audio_base64_puro": "<Base64>",
    "payload_original": { /* JSON enriquecido con dia_legible, hora_legible, enlaces acortados… */ }
  }
}

POST /bot/lead

Crea o actualiza un lead de forma independiente:

curl -X POST http://<HOST>:4000/bot/lead \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2",
    "telefono": "+59179790873",
    "instancia_evolution_api": "quiroz"
  }'

Respuesta esperada:

{
  "success": true,
  "data": {
    "lead_id": 123,
    "user_id": "2",
    "isNew": true
  }
}

GET /bot/lead

Busca un lead existente por teléfono e instancia:

curl -G http://<HOST>:4000/bot/lead \
  --data-urlencode "telefono=+59179790873" \
  --data-urlencode "instancia_evolution_api=quiroz"

Respuesta esperada:

{
  "success": true,
  "data": {
    "lead_id": 123,
    "user_id": "2",
    "nombre": "Sasha",
    "apellido": "Quiroz",
    "email": "sasha@example.com",
    "fecha": "2025-06-20 15:30:00",
    "zona_horaria": "America/La_Paz",
    "fuente": null,
    "ciudad": "Cochabamba",
    "pais": "Bolivia",
    "payload": { /* datos extra */ }
  }
}

⚙️ Dependencias principales

    Node.js 18+

    Express

    moment-timezone (idioma ES)

    mysql2 (MySQL async)

    @aws-sdk/client-s3 (MinIO)

    ffmpeg-static + fluent-ffmpeg

    axios + form-data

    uuid

    dotenv

🐳 Despliegue
Desarrollo (Docker Compose)

docker-compose -f docker-compose-dev.yml up -d --build

    Expone el servicio en el puerto 4001.

    Usa tu directorio local como volumen para desarrollo en caliente.

Producción (Docker Compose/Traefik)

docker-compose up -d --build

    Expone el servicio en el puerto 4000.

    Definido en docker-compose.yml junto a etiquetas de Traefik.

🔐 Variables de entorno

Defínelas en tu .env o en los bloques environment de los Docker Compose:

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

📝 Notas

    Modularización: cada paso (preprocess, acortar, handleMensaje, handleEtapa, sendResponse) vive en su propio handler.

    Configuración centralizada en config.js.

    Middleware global (errorHandler.js) captura y formatea errores.

    Cache de URLs y detección de enlaces ya acortados.

    Logs con contexto para facilitar depuración en producción.

    Futuro: tests automatizados e integración continua.

📞 Contacto

Proyecto desarrollado por Kurukin
Soporte técnico: Javier Quiroz