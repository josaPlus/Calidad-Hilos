import pino from 'pino';
import crypto from 'crypto';

// Retención sugerida: 30 días hot, 90 días cold
// Configura tu sistema de logs (DigitalOcean, Datadog, etc.) con esta política

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Logging estructurado en JSON — requerido por checklist
  formatters: {
    level(label) {
      return { level: label };
    },
  },

  // Sin datos sensibles en logs — requerido por checklist
  redact: {
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.email',
      'password',
      'token',
    ],
    censor: '[REDACTED]',
  },

  base: {
    app: 'hilos-app',
    env: process.env.NODE_ENV || 'development',
    equipo: ['Josafat Aguirre', 'Ruth Manriquez', 'Camila Liedo'],
  },

  timestamp: pino.stdTimeFunctions.isoTime,
});

// Genera un Correlation ID único por request — requerido por checklist
export function generateCorrelationId() {
  return crypto.randomUUID();
}

export default logger;