import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pagosAPI } from '../../services/api.js';

export const fetchPagos    = createAsyncThunk('pagos/fetch',  async () => (await pagosAPI.list()).data.pagos);
export const fetchSaldos   = createAsyncThunk('pagos/saldos', async () => (await pagosAPI.saldos()).data.saldos);
export const registrarPagoThunk = createAsyncThunk(
  'pagos/registrar',
  async (data) => (await pagosAPI.registrar(data)).data
);

const slice = createSlice({
  name: 'pagos',
  initialState: { items: [], saldos: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchPagos.fulfilled,  (s, a) => { s.items = a.payload; })
     .addCase(fetchSaldos.fulfilled, (s, a) => { s.saldos = a.payload; });
  },
});

export default slice.reducer;
