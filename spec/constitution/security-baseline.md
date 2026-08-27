# Seguridad Baseline — ClimbForge

Checklist no negociable. Ninguna feature se da por terminada si no cumple lo que le aplica.
Actualizado tras la migracion de Supabase/Postgres a Laravel/MySQL.

## 1. Secretos y claves
- [ ] Ninguna clave (Gemini, R2, credenciales de MySQL, APP_KEY de Laravel) hardcodeada en codigo
- [ ] .env en .gitignore desde el primer commit
- [ ] Escaneo de secretos en CI antes de cada push
- [ ] Credenciales de R2 y de MySQL solo en el .env del servidor, nunca en el repo

## 2. Base de datos (MySQL, sin RLS nativo)
- [ ] Cada modelo Eloquent con datos de usuario usa un Global Scope que filtra automaticamente por el usuario autenticado — es la compensacion obligatoria por no tener RLS
- [ ] Verificar en cada PR que un modelo nuevo con datos de usuario no se olvido del Global Scope
- [ ] Consultas siempre via Eloquent o Query Builder parametrizado; prohibido DB::raw() con interpolacion de variables
- [ ] Si se usan CHECK constraints en las migraciones, verificar la version real de MySQL/MariaDB del hosting: versiones antiguas de MariaDB parsean pero IGNORAN los CHECK sin dar error — no asumir que funcionan, comprobarlo
- [ ] Cifrado en transito (HTTPS/TLS) obligatorio; cifrado en reposo depende del plan de IONOS, verificar

## 3. Autenticacion y sesion (Laravel Sanctum)
- [ ] SPA de React autenticada via cookie httpOnly+secure+sameSite (Sanctum SPA authentication), no via token en localStorage
- [ ] App movil (Capacitor, mas adelante) autenticada via token Sanctum, no via cookie
- [ ] Contrasenas hasheadas por Laravel (bcrypt) por defecto, no reimplementar
- [ ] Rate limiting en login/signup via el middleware throttle
- [ ] Bloqueo temporal de cuenta tras intentos fallidos repetidos
- [ ] Proteccion anti-bot en formularios publicos: CAPTCHA + honeypot field

## 4. API / Backend
- [ ] Validacion de entrada en TODOS los endpoints con Form Requests de Laravel
- [ ] Middleware de cabeceras de seguridad explicito (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) — Laravel no las trae por defecto, hay que anadirlas a mano
- [ ] Rate limiting global en toda la API via throttle middleware
- [ ] HTTPS forzado en todos los entornos
- [ ] CORS restringido al origen real del frontend, nunca *

## 5. Subida de archivos (videos y fotos de escalada)
- [ ] Todo archivo subido va a Cloudflare R2, nunca al disco del hosting IONOS
- [ ] Whitelist de tipos MIME permitidos (video/mp4, image/jpeg, image/png)
- [ ] Limite de tamano maximo por archivo
- [ ] Cada usuario solo accede a sus propios archivos (politica de acceso a nivel de R2 + verificacion en el backend)
- [ ] Nombre de archivo generado por el servidor, nunca el original del usuario tal cual

## 6. Frontend
- [ ] Nunca dangerouslySetInnerHTML con contenido de usuario sin sanitizar
- [ ] Contenido generado por usuario se escapa por defecto via JSX
- [ ] Ninguna clave de Gemini/R2/base de datos llega al bundle del frontend

## 7. Automatizacion / CI
- [ ] Lint con reglas de seguridad en cada PR (frontend: eslint-plugin-security; backend: revisar via PHPStan/Larastan)
- [ ] Auditoria de dependencias automatizada: npm audit (frontend) y composer audit (backend)
- [ ] Tests deben pasar antes de mergear a la rama principal
