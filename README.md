# 🤖 Midas Bot (v1.3)

Microservicio modular en Node.js y Express que devuelve texto HTML, imagen y audio fusionado (voz TTS + audio base) según la etapa de un usuario. Ahora con:

- Arquitectura _handler-based_  
- Healthcheck  
- Middleware global de errores  
- Configuración centralizada en `config.js`  
- **Normalización de nombres** vía `utils/nameUtils.js` + diccionario (`utils/nameDictionary.js`)  
- Soporte para plantillas propias de HTML (`payload.texto_html`)  

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
│ ├── urlShortener.js
│ ├── nameDictionary.js ← Diccionario de 1000+ nombres latinos
│ └── nameUtils.js ← Funciones de normalización
├── config.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose-dev.yml
└── docker-compose.yml


---

## 🚀 Endpoints

### `GET /health`  
Comprueba el estado del servicio:

```bash
curl http://<HOST>:4000/health
# → { "status": "ok" }

POST /bot/etapa

Flujo principal (etapa o mensaje directo). Payload mínimo:

curl -X POST "http://<HOST>:<PUERTO>/bot/etapa" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2",
    "nombre": "juan LUIS",
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

    Si incluyes "mensaje": "...", se omite la etapa y solo se devuelve HTML interpolado.

Ejemplo de payload con plantilla propia:

curl -X POST "http://<HOST>:<PUERTO>/bot/etapa" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "3",
    "nombre": "Ana",
    "apellido": "Pérez",
    "telefono": "+59179790873",
    "email": "test@example.com",
    "etapa": "dunn",
    "pais": "Bolivia",
    "ciudad": "Cochabamba",
    "zona_horaria": "America/La_Paz",
    "instancia_evolution_api": "prueba",
    "texto_html": "¡Hola <b>{nombre}</b>, bienvenido a la etapa de prueba! Visita {link}."
  }'

Respuesta esperada:

{
  "success": true,
  "data": {
    "imagen_base64_puro": "<Base64>",
    "texto_html": "¡Hola <b>Ana</b>, bienvenido a la etapa de prueba! Visita https://…",
    "audio_base64_puro": "<Base64>",
    "payload_original": { /* JSON enriquecido con dia_legible, hora_legible, enlaces acortados… */ }
  }
}

✨ Normalización de nombres

Ahora, antes de procesar, los campos nombre y apellido se normalizan usando:

    utils/nameDictionary.js: más de 1000 nombres latinos.

    utils/nameUtils.js: lógica de mayúsculas, tildes, espacios y compuestos.

normalizeName('maria DEL Carmen')      // → 'María del Carmen'
normalizeName('LUISangel')             // → 'Luis Ángel'
normalizeSurname('perez GÓmez')        // → 'Pérez Gómez'

⚙️ Dependencias principales

    Node.js 18+

    Express

    moment-timezone (es)

    mysql2

    @aws-sdk/client-s3

    ffmpeg-static + fluent-ffmpeg

    axios + form-data

    uuid

    dotenv

🐳 Despliegue
Desarrollo

docker-compose -f docker-compose-dev.yml up -d --build

    Expuesto en puerto 4001.

    Volumen local para desarrollo en caliente.

Producción

docker-compose up -d --build

    Expuesto en puerto 4000.

    Integrado con Traefik en docker-compose.yml.

🔐 Variables de entorno

# API
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

    Modularidad: cada paso en su handler.

    Configuración central en config.js.

    Errores globales en middlewares/errorHandler.js.

    Cache y manejo de duplicados en URL shortener.

    Logs explícitos en cada etapa.

    Personalización avanzada vía nameUtils + nameDictionary.

📞 Contacto

Kurukin – Proyecto desarrollado por Javier Quiroz.