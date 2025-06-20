// middlewares/errorHandler.js

/**
 * Middleware global para manejar errores no atrapados.
 * Debe ir **al final** de todas las rutas.
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Unhandled error:', err);

  // Si el error trae status y message, los usamos; si no, 500 + mensaje por defecto
  const status  = err.status  || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    error: message
  });
}

module.exports = errorHandler;
