// server.js

// ————— 1) Cargar variables de entorno al inicio —————
require('dotenv').config();

const express       = require('express');
const bodyParser    = require('body-parser');
const botRoutes     = require('./routes/botRoutes');
const testRoutes    = require('./routes/testRoutes'); // si lo usas
const errorHandler  = require('./middlewares/errorHandler');

const app = express();

// ————— 2) Middlewares globales —————
app.use(bodyParser.json());

// ————— 3) Healthcheck —————
// Endpoint ligero para comprobar que el servicio está disponible
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ————— 4) Rutas de la aplicación —————
app.use('/bot', botRoutes);
app.use('/test', testRoutes); // opcional

// ————— 5) Middleware de captura de errores —————
app.use(errorHandler);

// ————— 6) Levantar servidor —————
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Midas Bot API corriendo en puerto ${PORT}`);
});
