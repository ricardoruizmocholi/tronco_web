# Stack Tecnologico — ClimbForge

| Capa | Eleccion | Por que |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind | Sin cambios: portable a movil via Capacitor sin rehacer UI |
| Mobile | Capacitor | Sin cambios |
| Backend | Laravel (PHP 8.3), como API JSON | Validacion, ORM parametrizado, hashing y rate limiting integrados; encaja con hosting compartido sin Docker/Node |
| Servidor | IONOS hosting compartido, despliegue via SSH + git + composer | Ya contratado; PHP 8.3 y SSH con Composer confirmados |
| Base de datos | MySQL/MariaDB gestionada por IONOS | Disponible nativamente en el hosting compartido |
| Autenticacion | Laravel Sanctum | Cookies httpOnly para el SPA de React, tokens para la app movil futura — resuelve el riesgo de token en localStorage que teniamos documentado con Supabase |
| Storage de video/foto | Cloudflare R2 (S3-compatible) | El hosting compartido de IONOS no es apto para servir archivos grandes de usuarios (cuota, sin CDN) |
| IA — entrenamiento y dieta | Google Gemini API | Encapsulada en un AIProviderService propio dentro de Laravel |
| Tests | Vitest (frontend) / Pest o PHPUnit (backend) | Estandar de cada ecosistema |
| Desarrollo local | XAMPP | Ya instalado; Apache+PHP+MySQL local, sin necesidad de Docker |

## Claves de arquitectura
- Laravel se despliega como API pura (routes/api.php devolviendo JSON) — el frontend sigue siendo la SPA de React, no vistas Blade
- Docker queda fuera del proyecto: no esta disponible en hosting compartido y no hace falta con XAMPP en local
- Despliegue: git pull + composer install --no-dev + php artisan migrate en el servidor via SSH
- Si el document root no se puede fijar a public/, se compensa con un .htaccess de redireccion (ver plan.md de cada feature que lo necesite)
