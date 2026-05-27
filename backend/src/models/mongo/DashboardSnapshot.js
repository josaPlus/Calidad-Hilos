import mongoose from 'mongoose';

const DashboardSnapshotSchema = new mongoose.Schema(
  {
    tipo:       { type: String, required: true, enum: ['clientes','finanzas','hilos'], index: true },
    rango:      { type: String, required: true, enum: ['hoy','semana','mes','trimestre','año','custom'] },
    desde:      { type: Date },
    hasta:      { type: Date },
    data:       { type: mongoose.Schema.Types.Mixed, required: true }, // KPIs serializados
    generadoEn: { type: Date, default: Date.now, index: true },
    usuarioId:  { type: Number },
  },
  { timestamps: false }
);

// TTL: snapshots viejos se borran solos a los 30 días
DashboardSnapshotSchema.index({ generadoEn: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model('DashboardSnapshot', DashboardSnapshotSchema);
