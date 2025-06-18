# 🤖 Midas Bot (v1.1)

Microservicio modular en Node.js + Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Soporta reemplazo dinámico de variables, conversión de fechas por zona horaria, y acortamiento automático de enlaces (Zoom, Meet, etc) vía YOURLS.

---

## 🧱 Estructura general

midas-bot/
├── controllers/
│ └── botController.js
├── routes/
│ └── botRoutes.js
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

## 🚀 Endpoint principal

### `POST /bot/etapa`

### 🔸 Payload de entrada (JSON)

```json
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
  "zoom": "https://us02web.zoom.us/...",
  "link_slug": "zoom",
  "etapa": "dunn",
  "instancia_evolution_api": "quiroz",
  "GMT": "0"
}

✅ Respuesta esperada:

{
  "success": true,
  "data": {
    "imagen_base64_puro": "...",
    "texto_html": "🌸 Hola Sasha, tu sesión está confirmada...",
    "audio_base64_puro": "...",
    "payload_original": { ... }
  }
}

✂️ Enlaces acortados con YOURLS

    Las variables zoom, meet y link se detectan automáticamente.

    Si existe link_slug, se genera una URL como: https://kuruk.in/zoom-8ks

    Si no hay link_slug, se genera una URL aleatoria: https://kuruk.in/r8g

    El valor acortado reemplaza automáticamente al original en texto_html.

⚙️ Dependencias principales

    Node.js 18+

    Express

    MySQL2 (modo async)

    AWS SDK v3 para MinIO

    ElevenLabs TTS API

    FFmpeg (vía fluent-ffmpeg)

    YOURLS API (para acortar URLs)

🐳 Despliegue (Docker)
1. Build local:

docker build -t midas-bot:latest .

2. Docker Compose:

docker-compose up -d

3. Portainer:

Puedes cargar docker-compose.yml desde Portainer para autodespliegue.
🔐 Variables de entorno esperadas

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

YOURLS_API=https://kuruk.in/yourls-api.php
YOURLS_SIGNATURE=0eb5a147eb

📝 Notas

    Usa wa_bot_config de WordPress para la configuración de TTS.

    Audios fusionados dinámicamente con FFmpeg.

    Variables como {nombre}, {fecha}, {zoom}, {dia_legible} se reemplazan en tiempo real.

    Si el payload contiene mensaje, se usa como HTML final sin buscar etapa.

🔁 Ejemplos (cURL)

curl -X POST http://104.236.36.75:3000/bot/etapa \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2",
    "nombre": "Sasha",
    "apellido": "Quiroz",
    "telefono": "+59179790873",
    "email": "javierquiroztv@gmail.com",
    "ciudad": "Cochabamba",
    "pais": "Bolivia",
    "zona_horaria": "America/La_Paz",
    "etapa": "dunn",
    "instancia_evolution_api": "quiroz"
  }'

curl -X POST https://midas.kurukin.com/bot/etapa --insecure \
  -H "Content-Type: application/json" \
  -d '{"user_id": "2", "nombre": "Sasha", "etapa": "dunn"}'

📞 Contacto

Proyecto desarrollado por Kurukin
Soporte técnico: Javier Quiroz