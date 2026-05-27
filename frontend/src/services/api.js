import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:    (email, password) => api.post('/auth/login', { email, password }),
  register: (data)            => api.post('/auth/register', data),
  me:       ()                => api.get('/auth/me'),
  logout:   ()                => api.post('/auth/logout'),
};

export const clientesAPI = {
  list:   ()         => api.get('/clientes'),
  get:    (id)       => api.get(`/clientes/${id}`),
  create: (data)     => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  remove: (id)       => api.delete(`/clientes/${id}`),
  addDescuento:    (id, data)    => api.post(`/clientes/${id}/descuentos`, data),
  removeDescuento: (id, dId)     => api.delete(`/clientes/${id}/descuentos/${dId}`),
};

export const productosAPI = {
  list:   ()        => api.get('/productos'),
  create: (data)    => api.post('/productos', data),
  update: (id,data) => api.put(`/productos/${id}`, data),
};

export const ventasAPI = {
  proximoNumero: ()         => api.get('/ventas/proximo-numero'),
  list:          (params)   => api.get('/ventas', { params }),
  get:           (id)       => api.get(`/ventas/${id}`),
  create:        (data)     => api.post('/ventas', data),
  update:        (id, data) => api.put(`/ventas/${id}`, data),
  remove:        (id)       => api.delete(`/ventas/${id}`),
};

export const pagosAPI = {
  list:        ()      => api.get('/pagos'),
  saldos:      ()      => api.get('/pagos/saldo/pendiente'),
  registrar:   (data)  => api.post('/pagos', data),
};

export const egresosAPI = {
  list:   (params) => api.get('/egresos', { params }),
  create: (data)   => api.post('/egresos', data),
  remove: (id)     => api.delete(`/egresos/${id}`),
  categorias: ()   => api.get('/categorias-egreso'),
};

export const dashboardAPI = {
  clientes: ()       => api.get('/dashboard/clientes'),
  finanzas: (params) => api.get('/dashboard/finanzas', { params }),
  hilos:    (params) => api.get('/dashboard/hilos',    { params }),
};

export const usersAPI = {
  list:   ()         => api.get('/users'),
  create: (data)     => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id)       => api.delete(`/users/${id}`),
};

export default api;
