import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { egresosAPI } from '../../services/api.js';

export const fetchEgresos      = createAsyncThunk('egresos/fetch',  async (params) => (await egresosAPI.list(params)).data.egresos);
export const fetchCategorias   = createAsyncThunk('egresos/cats',   async () => (await egresosAPI.categorias()).data.categorias);
export const createEgresoThunk = createAsyncThunk('egresos/create', async (data) => (await egresosAPI.create(data)).data.egreso);
export const deleteEgresoThunk = createAsyncThunk('egresos/delete', async (id)   => { await egresosAPI.remove(id); return id; });

const slice = createSlice({
  name: 'egresos',
  initialState: { items: [], categorias: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEgresos.pending,   (s) => { s.loading = true; })
     .addCase(fetchEgresos.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
     .addCase(fetchEgresos.rejected,  (s, a) => { s.loading = false; s.error = a.error.message; })
     .addCase(fetchCategorias.fulfilled, (s, a) => { s.categorias = a.payload; })
     .addCase(createEgresoThunk.fulfilled, (s, a) => { s.items.unshift(a.payload); })
     .addCase(deleteEgresoThunk.fulfilled, (s, a) => { s.items = s.items.filter(e => e._id !== a.payload); });
  },
});

export default slice.reducer;
