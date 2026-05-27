import mongoose from 'mongoose';
import dns from 'dns';

// Importar los modelos para que Mongoose los registre
import '../models/mongo/Egreso.js';
import '../models/mongo/AuditLog.js';
import '../models/mongo/Notificacion.js';
import '../models/mongo/DashboardSnapshot.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

let connected = false;

export async function initMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hilos_app';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    connected = true;
    console.log(`✅ MongoDB conectado: ${uri.replace(/:[^@/]+@/, ':***@')}`);

    // Forzar la creación de las 4 colecciones
    const modelos = ['Egreso', 'AuditLog', 'Notificacion', 'DashboardSnapshot'];
    for (const nombre of modelos) {
      try {
        await mongoose.model(nombre).createCollection();
      } catch (err) {
        // Si ya existe, Mongo ignora silenciosamente
      }
    }
    console.log('✅ Colecciones de MongoDB verificadas');

  } catch (err) {
    console.warn(`⚠️  MongoDB NO disponible (${err.message}). La app sigue funcionando, pero egresos/logs no se guardan.`);
    connected = false;
  }
}

export function isMongoConnected() {
  return connected && mongoose.connection.readyState === 1;
}

export async function closeMongo() {
  if (connected) await mongoose.disconnect();
}