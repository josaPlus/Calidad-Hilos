import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ventasAPI } from '../../services/api.js';

export const fetchVentas = createAsyncThunk(
  'ventas/fetch',
  async (params) => (await ventasAPI.list(params)).data.notas
);
export const createVentaThunk = createAsyncThunk(
  'ventas/create',
  async (data) => (await ventasAPI.create(data)).data.nota
);
export const updateVentaThunk = createAsyncThunk(
  'ventas/update',
  async ({ id, data }) => { await ventasAPI.update(id, data); return { id, ...data }; }
);
export const deleteVentaThunk = createAsyncThunk(
  'ventas/delete',
  async (id) => { await ventasAPI.remove(id); return id; }
);

const slice = createSlice({
  name: 'ventas',
  initialState: { items: [], loading: false, error: null, proximoNumero: 1 },
  reducers: {
    setProximoNumero: (s, a) => { s.proximoNumero = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchVentas.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(fetchVentas.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
     .addCase(fetchVentas.rejected,  (s, a) => { s.loading = false; s.error = a.error.message; })
     .addCase(createVentaThunk.fulfilled, (s, a) => { s.items.unshift(a.payload); })
     .addCase(deleteVentaThunk.fulfilled, (s, a) => {
        s.items = s.items.filter(v => v.id !== a.payload);
      });
  },
});

export const { setProximoNumero } = slice.actions;
export default slice.reducer;
