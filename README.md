# 🤖 Midas Bot (v1.0)

Microservicio modular en Node.js + Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Conexión a MinIO y MySQL (WordPress).

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
│ └── textUtils.js
├── server.js
├── package.json
├── Dockerfile
└── docker-compose.yml


---

## 🚀 Endpoint principal

`POST /bot/etapa`

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
  "etapa": "dunn",
  "instancia_evolution_api": "quiroz"
}

✅ Respuesta esperada

{
  "success": true,
  "data": {
    "imagen_base64_puro": "...",
    "texto_html": "✨ Hola Sasha! Bienvenida a la revolución de las ideas...",
    "audio_base64_puro": "...",
    "payload_original": { ... }
  }
}

⚙️ Dependencias principales

    Node.js 18+

    Express

    MySQL2 (modo async)

    AWS SDK v3 para MinIO

    ElevenLabs TTS API

    FFmpeg (para fusión de audio vía fluent-ffmpeg)

    Docker + Portainer (entorno de despliegue)

🐳 Despliegue (Docker)
1. Build local

docker build -t midas-bot:latest .

2. Docker Compose

docker-compose up -d

3. Portainer

Puedes cargar el docker-compose.yml dentro de Portainer para stack automático.
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

📌 Notas

    Se conecta a la tabla wa_bot_config de WordPress para obtener la config TTS.

    Los audios se fusionan dinámicamente usando ffmpeg (incluido en contenedor).

    Las variables dentro del texto ({nombre}, {ciudad}, etc.) son reemplazadas en tiempo real desde el payload.

📞 Contacto

Proyecto mantenido por Kurukin. Para soporte técnico contactar a Javier Quiroz.


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
