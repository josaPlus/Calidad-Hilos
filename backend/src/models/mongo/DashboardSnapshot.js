import mongoose from 'mongoose';

const DashboardSnapshotSchema = new mongoose.Schema(
  {
    tipo:       { type: String, required: true, enum: ['clientes','finanzas','hilos'], index: true },
    rango:      { type: String, required: true, enum: ['hoy','semana','mes','trimestre','año','custom'] },
    desde:      { type: Date },
    hasta:      { type: Date },
    data:       { type: mongoose.Schema.Types.Mixed, required: true },
    generadoEn: { type: Date, default: Date.now },
    usuarioId:  { type: Number },
  },
  {
    timestamps: false,
    expireAfterSeconds: 60 * 60 * 24 * 30,
  }
);

// Solo UN índice TTL, sin duplicado
DashboardSnapshotSchema.index({ generadoEn: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model('DashboardSnapshot', DashboardSnapshotSchema);