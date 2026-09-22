import axios from 'axios'
import { MAINTENANCE_DETECTED_EVENT } from './maintenanceEvent'

const api = axios.create({
  baseURL: 'http://localhost',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

// Corte instantáneo del modo mantenimiento: en cuanto CUALQUIER petición choca
// con el 503 del middleware, avisa a MaintenanceContext sin esperar a su
// siguiente sondeo — así un cliente con la SPA ya abierta se entera en el
// momento exacto en que su propia acción queda bloqueada, no más tarde.
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 503 && error.response.data?.maintenance === true) {
      window.dispatchEvent(new CustomEvent(MAINTENANCE_DETECTED_EVENT))
    }
    return Promise.reject(error)
  }
)

export default api