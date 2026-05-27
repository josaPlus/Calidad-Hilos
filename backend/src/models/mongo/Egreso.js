import mongoose from 'mongoose';

const EgresoSchema = new mongoose.Schema(
  {
    fecha:        { type: Date, required: true, index: true },
    categoria:    { type: String, required: true, index: true },
    concepto:     { type: String, required: true },
    monto:        { type: Number, required: true, min: 0 },
    metodoPago:   { type: String, default: 'efectivo' },
    referencia:   { type: String, default: '' },
    observaciones:{ type: String, default: '' },
    // Quién registra (referencia al usuario SQLite)
    usuarioId:    { type: Number, required: true, index: true },
    usuarioNombre:{ type: String, default: '' },
    // Metadatos flexibles
    adjuntos:     [{ nombre: String, url: String, tipo: String }],
    tags:         [{ type: String }],
  },
  { timestamps: true }
);

EgresoSchema.index({ fecha: -1, categoria: 1 });

export default mongoose.model('Egreso', EgresoSchema);
