import mongoose from 'mongoose';

const NotificacionSchema = new mongoose.Schema(
  {
    usuarioId:    { type: Number, required: true, index: true }, // destinatario
    tipo:         { type: String, required: true, enum: ['info','success','warning','error'] },
    titulo:       { type: String, required: true },
    mensaje:      { type: String, required: true },
    leida:        { type: Boolean, default: false, index: true },
    link:         { type: String, default: '' },
    metadata:     { type: mongoose.Schema.Types.Mixed },
    fecha:        { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export default mongoose.model('Notificacion', NotificacionSchema);
