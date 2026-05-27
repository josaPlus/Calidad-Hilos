import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productosAPI } from '../../services/api.js';

export const fetchProductos = createAsyncThunk(
  'productos/fetch',
  async () => (await productosAPI.list()).data.productos
);

const slice = createSlice({
  name: 'productos',
  initialState: { items: [], loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProductos.pending,   (s) => { s.loading = true; })
     .addCase(fetchProductos.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; });
  },
});

export default slice.reducer;
