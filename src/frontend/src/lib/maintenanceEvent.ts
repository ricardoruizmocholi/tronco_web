// Nombre del evento DOM que dispara lib/axios.ts en cuanto una petición choca
// con el 503 del middleware de mantenimiento, y que MaintenanceContext escucha
// para pasar a activo al instante sin esperar al siguiente poll. Vive en su
// propio archivo para que ninguno de los dos tenga que importar del otro.
export const MAINTENANCE_DETECTED_EVENT = 'maintenance-detected'
