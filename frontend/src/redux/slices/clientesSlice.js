import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientesAPI } from '../../services/api.js';

export const fetchClientes = createAsyncThunk(
  'clientes/fetch',
  async () => (await clientesAPI.list()).data.clientes
);

export const createClienteThunk = createAsyncThunk(
  'clientes/create',
  async (data) => (await clientesAPI.create(data)).data.cliente
);

export const updateClienteThunk = createAsyncThunk(
  'clientes/update',
  async ({ id, data }) => (await clientesAPI.update(id, data)).data.cliente
);

export const deleteClienteThunk = createAsyncThunk(
  'clientes/delete',
  async (id) => { await clientesAPI.remove(id); return id; }
);

const slice = createSlice({
  name: 'clientes',
  initialState: { items: [], loading: false, error: null, filter: '' },
  reducers: {
    setFilter: (s, a) => { s.filter = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchClientes.pending,   (s) => { s.loading = true;  s.error = null; })
     .addCase(fetchClientes.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
     .addCase(fetchClientes.rejected,  (s, a) => { s.loading = false; s.error = a.error.message; })
     .addCase(createClienteThunk.fulfilled, (s, a) => { s.items.unshift(a.payload); })
     .addCase(updateClienteThunk.fulfilled, (s, a) => {
        const i = s.items.findIndex(c => c.id === a.payload.id);
        if (i >= 0) s.items[i] = { ...s.items[i], ...a.payload };
      })
     .addCase(deleteClienteThunk.fulfilled, (s, a) => {
        s.items = s.items.filter(c => c.id !== a.payload);
      });
  },
});

export const { setFilter } = slice.actions;
export default slice.reducer;
