import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    accion:       { type: String, required: true, index: true },
    entidad:      { type: String, required: true, index: true }, // 'venta', 'cliente', etc.
    entidadId:    { type: String },
    usuarioId:    { type: Number, required: true, index: true },
    usuarioNombre:{ type: String, default: '' },
    rol:          { type: String, default: '' },
    payload:      { type: mongoose.Schema.Types.Mixed }, // antes/después/diff
    ip:           { type: String, default: '' },
    fecha:        { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AuditLogSchema.index({ fecha: -1 });

export default mongoose.model('AuditLog', AuditLogSchema);
