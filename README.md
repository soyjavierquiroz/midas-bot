# 🤖 Midas Bot (v1.2)

Microservicio modular en Node.js + Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Ahora con arquitectura handler-based, healthcheck, middleware de errores y estructura más limpia.

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
│ ├── etapaService.js
│ ├── fusionService.js
│ ├── minioService.js
│ └── ttsService.js
├── utils/
│ ├── textUtils.js
│ └── urlShortener.js
├── server.js
├── package.json
├── Dockerfile
└── docker-compose.yml


---

## 🚀 Endpoints

### `GET /health`

Comprueba que el servicio está arriba y funcionando:

```bash
curl http://<HOST>:4000/health
# → { "status": "ok" }

POST /bot/etapa

Flujo principal de procesamiento de “etapa”:
🔸 Payload de entrada (JSON)

{
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
}

✅ Comportamiento

    preprocessPayload

        Enriquecer con dia_legible y hora_legible (moment-timezone).

    acortarLinks

        Interpola {zoom}, {meet}, {link} → encodeURI → corta con YOURLS.

        Si la URL ya existía, recupera el alias sin error.

    handleEtapa

        Valida user_id y etapa.

        Recupera textos y audios base desde MySQL/WordPress.

        Reemplaza placeholders en texto plano y HTML.

        Genera TTS (ElevenLabs) y fusiona con audio base (FFmpeg + fluent-ffmpeg).

        Descarga imagen de MinIO en Base64.

    sendResponse

        Devuelve { imagen_base64_puro, texto_html, audio_base64_puro, payload_original }.

🔸 Respuesta esperada

{
  "success": true,
  "data": {
    "imagen_base64_puro": "...",
    "texto_html": "🌸 Hola Sasha, tu sesión está confirmada...",
    "audio_base64_puro": "...",
    "payload_original": { /* mismo JSON de entrada, con campos enriquecidos */ }
  }
}

POST /bot/etapa con mensaje directo

Si envías mensaje en lugar de etapa, Midas devuelve ese HTML directamente (tras interpolar y acortar enlaces):

curl -X POST http://<HOST>:4000/bot/etapa \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Hola {nombre}, tu cita es el {dia_legible}",
    "nombre": "Sasha",
    "zona_horaria": "America/La_Paz",
    "fecha": "2025-06-20 15:30:00",
    "zoom": "https://us02web.zoom.us/…",
    "link_slug": "zoom"
  }'

Rutas adicionales

    GET /health — Healthcheck rápido.

    POST /bot/etapa — Flujo de etapa o mensaje.

    /test — Endpoints de prueba (según routes/testRoutes.js).

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

🐳 Despliegue (Docker + Traefik)

    Build local

docker build -t midas-bot:latest .

Docker Compose
Asegúrate de tener en docker-compose.yml todas tus variables en el bloque environment:

services:
  midas-bot:
    image: midas-bot:latest
    ports:
      - "4000:4000"
    environment:
      MINIO_ENDPOINT:           https://kminioback.kurukin.com
      MINIO_ACCESS_KEY:         ...
      MINIO_SECRET_KEY:         ...
      MINIO_REGION:             us-east-1
      MINIO_FORCE_PATH_STYLE:   "true"
      DB_HOST:                  wordpress_db
      DB_USER:                  bot_kurukin_user
      DB_PASSWORD:              ...
      DB_NAME:                  bot_kurukin_wp
      YOURLS_API:               https://kuruk.in/yourls-api.php
      YOURLS_SIGNATURE:         0eb5a147eb
    labels:
      - traefik.enable=true
      - traefik.http.routers.kurukinmidas.rule=Host(`midas.kurukin.com`)
      - traefik.http.routers.kurukinmidas.tls=true
      - traefik.http.services.kurukinmidas.loadbalancer.server.port=4000

Levantar

    docker-compose up -d --build

🔐 Variables de entorno

Definidas en docker-compose.yml:

MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_REGION=
MINIO_FORCE_PATH_STYLE=true

DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

YOURLS_API=
YOURLS_SIGNATURE=

📝 Notas

    Modularización: cada paso (preprocess, shorten, handleMensaje, handleEtapa, sendResponse) vive en su propio handler.

    Middleware global: middlewares/errorHandler.js captura y formatea errores.

    Healthcheck: GET /health listo para probes.

    Futuro: en la próxima versión añadiremos endpoint POST /bot/lead y tests automatizados.

📞 Contacto

Proyecto desarrollado por Kurukin
Soporte técnico: Javier Quiroz