# 009 — Home: banners y colaboradores

## Spec

### Qué hace
Añade a la home una sección hero con banner editable desde el admin
(imagen, título, subtítulo y CTA), y una sección de colaboradores con
logos y enlace externo. Ambas secciones son gestionables sin tocar código.

### Criterios de aceptación
- [ ] La home muestra un banner hero con imagen de fondo, título, subtítulo y botón CTA
- [ ] El admin puede crear, editar, reordenar y desactivar banners
- [ ] Solo los banners activos se muestran en la home pública
- [ ] Si hay varios banners activos, se muestran como carrusel o el primero según orden
- [ ] La home muestra una sección "Colaboradores" con logo y enlace externo de cada uno
- [ ] Los links de colaboradores abren en `target="_blank"` con `rel="noopener noreferrer"`
- [ ] El admin puede crear, editar y desactivar colaboradores
- [ ] El admin puede subir imagen de logo para cada colaborador

### Fuera de alcance
- Carrusel animado con autoplay (si se implementa más de un banner, se puede quedar estático en MVP)
- Estadísticas de clicks en banners o colaboradores

---

## Plan

### Backend
- Migración `banners`: id, title, subtitle (nullable), cta_label (nullable), cta_url (nullable), image_url, sort_order (int default 0), is_active (boolean), timestamps
- Migración `collaborators`: id, name, logo_url, url, is_active (boolean), sort_order (int default 0), timestamps
- Modelos `Banner` y `Collaborator` con scope `active()`
- Endpoints públicos: `GET /api/banners`, `GET /api/collaborators`
- Endpoints admin CRUD: `/api/admin/banners`, `/api/admin/collaborators` (incluyendo subida de imagen de logo)

### Frontend
- `api/banners.ts` y `api/collaborators.ts` con llamadas públicas y admin
- `HomePage.tsx`: sección hero con primer banner activo; sección colaboradores con grid de logos
- `AdminBannersPage.tsx`: tabla + formulario crear/editar banner con subida de imagen
- `AdminCollaboratorsPage.tsx`: tabla + formulario con subida de logo
- Cards en `AdminDashboardPage` para "Banners" y "Colaboradores"

### Dependencia
Requiere `000-infraestructura-docker` y endpoint de subida de imágenes (`/api/upload-image`).

---

## Tasks

1. [x] Migración `banners`
2. [x] Migración `collaborators`
3. [x] Modelos `Banner` y `Collaborator`
4. [x] Endpoints públicos GET banners y colaboradores
5. [x] Endpoints admin CRUD banners (con imagen)
6. [x] Endpoints admin CRUD colaboradores (con logo)
7. [x] `HomePage.tsx`: sección hero con banner activo
8. [x] `HomePage.tsx`: sección colaboradores
9. [x] `AdminBannersPage.tsx`: tabla + formulario
10. [x] `AdminCollaboratorsPage.tsx`: tabla + formulario
11. [x] Cards en `AdminDashboardPage`
12. [ ] Verificar los 8 criterios de aceptación
