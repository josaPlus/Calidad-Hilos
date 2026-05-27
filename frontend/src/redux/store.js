import { configureStore } from '@reduxjs/toolkit';
import clientesReducer from './slices/clientesSlice.js';
import ventasReducer   from './slices/ventasSlice.js';
import pagosReducer    from './slices/pagosSlice.js';
import egresosReducer  from './slices/egresosSlice.js';
import productosReducer from './slices/productosSlice.js';

export const store = configureStore({
  reducer: {
    clientes:  clientesReducer,
    ventas:    ventasReducer,
    pagos:     pagosReducer,
    egresos:   egresosReducer,
    productos: productosReducer,
  },
});
