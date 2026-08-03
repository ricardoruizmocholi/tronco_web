# 021 — Excel con Fórmulas y Resumen

## Spec

### Qué hace
Mejora los 4 exports admin existentes (pedidos, devoluciones, preorders, newsletter) con:
Excel de dos hojas (datos + resumen), fórmulas Excel reales (no valores precalculados en PHP),
formato visual profesional (cabecera oscura, zebra striping, freeze panes, formatos de
número/fecha). Preorders y newsletter pasan de CSV a `.xlsx`. El export de devoluciones no existía
— se crea desde cero.

### Principio rector: fórmulas reales, no valores calculados en PHP
Toda celda "calculada" (IVA, comisión Stripe, neto, días de resolución, conteos, sumas, %) se
escribe como un **string que empieza por `=`**. `PhpSpreadsheet` (que envuelve `maatwebsite/excel`)
interpreta automáticamente esos strings como fórmulas al escribir la celda — no hace falta ninguna
configuración especial, basta con que el valor devuelto por `map()`/`FromArray` empiece por `=`.
Si el admin edita un dato en la hoja de datos, las fórmulas de la hoja de datos y del resumen
que dependen de él se recalculan solas al abrir el archivo.

### Correcciones sobre el encargo original
El encargo daba ejemplos de fórmulas con letras de columna que no coinciden con el orden de
columnas que el propio encargo especifica. Se resuelven por posición real, no por la letra
literal del ejemplo:
- **Resumen de pedidos**: `Estado` es la columna **E** (orden real: ID, Usuario, Email, Fecha,
  Estado, ...), no D como decía el ejemplo (`D` es `Fecha`). Los `COUNTIF` usan `Pedidos!E:E`.
- **Devoluciones — "Días hasta resolución"**: con el orden de columnas dado (ID, Pedido ID,
  Usuario, Email, Motivo, Estado, Fecha solicitud, Fecha aprobación, Fecha recepción, Fecha
  reembolso, ...), Fecha solicitud es **G**, Fecha recepción es **I**, Fecha reembolso es **J** —
  no C/I/J como decía el ejemplo. Fórmula real:
  `=IF(J2<>"",DAYS(J2,G2),IF(I2<>"",DAYS(I2,G2),"Pendiente"))`
- **"Mes con más ingresos"**: no existe una fórmula Excel de una sola celda que calcule esto
  directamente sobre una columna de fechas+importes sin tabla auxiliar. Se construye un pequeño
  bloque `SUMIFS` por mes (uno por cada mes presente en el export) en la propia hoja Resumen, y
  `INDEX`/`MATCH` sobre ese bloque para el mes ganador. Cubre los meses presentes en el momento de
  la exportación — si se añaden filas con fechas de meses no listados, no se reflejan
  automáticamente (documentado en `docs/021-excel-formulas.md`).

### Criterios de aceptación

**Pedidos**
- [x] Hoja "Pedidos": ID, Usuario, Email, Fecha, Estado, Subtotal, Envío, Total, Nº Items,
      Dirección, Transportista, Nº Seguimiento + 3 columnas calculadas (IVA 21%, comisión Stripe
      estimada, neto estimado), todas como fórmulas reales
- [x] Fila de totales al final con `COUNTA`/`SUM` reales
- [x] Hoja "Resumen": total pedidos, pedidos por estado (`COUNTIF` + %), ingreso bruto/neto
      (`SUM`), ticket medio, mes con más ingresos — todo con fórmulas reales

**Devoluciones**
- [x] `GET /api/admin/returns/export` existe y funciona (no existía antes de esta feature)
- [x] Hoja "Devoluciones" con las 12 columnas pedidas + "Días hasta resolución" como fórmula real
- [x] Hoja "Resumen devoluciones": total, por motivo, por estado, tasa de aprobación, importe
      total reembolsado, tiempo medio de resolución — fórmulas reales

**Preorders**
- [x] Export en `.xlsx` (ya no CSV), dos hojas
- [x] Hoja "Resumen preorders": por producto (tabla dinámica vía `COUNTIF`), por estado, tasa de
      conversión — fórmulas reales

**Newsletter**
- [x] Export en `.xlsx` (ya no CSV), dos hojas
- [x] Hoja "Resumen newsletter": total, suscritos este mes/año (`COUNTIFS`), crecimiento por mes
      (últimos 6 meses) — fórmulas reales

**Formato visual (los 4 exports)**
- [x] Cabecera: fondo `#1C1F1A`, texto blanco, negrita
- [x] Zebra striping en filas de datos
- [x] Columnas de dinero: 2 decimales + símbolo €
- [x] Columnas de fecha: `dd/mm/yyyy`
- [x] Autosize de columnas
- [x] Hoja Resumen: totales en negrita, valores destacados en `#5BBB2A`
- [x] Freeze panes (primera fila) en la hoja de datos

### Fuera de alcance
- Botón de exportar en el frontend de devoluciones (no existía y no se pide UI en este encargo)
- Gráficos/charts embebidos en el Excel
- Exportación programada / envío por email

---

## Plan

### Backend

**Trait compartido**
- `app/Exports/Concerns/StylesExportSheet.php`: helpers reutilizados por las 8 hojas
  (`styleHeaderRow`, `applyZebraStriping`, `freezeHeaderRow`, `formatMoneyColumns`,
  `formatDateColumns`, `styleSummaryHighlights`)

**Pedidos**
- `app/Exports/OrdersExport.php` (reescrito): `WithMultipleSheets` → `[OrdersDataSheet,
  OrdersSummarySheet]`
- `app/Exports/OrdersDataSheet.php`: `FromCollection/WithHeadings/WithMapping/WithTitle/WithEvents`
  — columnas + 3 fórmulas por fila + fila de totales (vía `AfterSheet`)
- `app/Exports/OrdersSummarySheet.php`: `FromArray/WithTitle/WithEvents` — resumen con fórmulas
  que referencian `Pedidos!...`
- `AdminOrderController@export` — sin cambios de firma, misma llamada a `Excel::download`

**Devoluciones**
- `app/Exports/ReturnsExport.php`, `ReturnsDataSheet.php`, `ReturnsSummarySheet.php` — mismo patrón
- `AdminReturnController@export` (nuevo) — mismo patrón de filtros que `index()`
- `routes/api.php`: `GET /admin/returns/export`, estática antes de `/returns/{return}`

**Preorders**
- `app/Exports/PreordersExport.php`, `PreordersDataSheet.php`, `PreordersSummarySheet.php`
- `AdminPreorderController@export` — sustituye el `streamDownload` CSV por `Excel::download`

**Newsletter**
- `app/Exports/NewsletterExport.php`, `NewsletterDataSheet.php`, `NewsletterSummarySheet.php`
- `AdminNewsletterController@export` — sustituye el `streamDownload` CSV por `Excel::download`

### Dependencias
- `maatwebsite/excel` ^3.1 (ya instalado, no se añade nada nuevo)

---

## Tasks

### Tarea 1 — Export de pedidos mejorado
1. [x] `app/Exports/Concerns/StylesExportSheet.php`
2. [x] `app/Exports/OrdersDataSheet.php` (hoja + fórmulas por fila + fila de totales)
3. [x] `app/Exports/OrdersSummarySheet.php` (hoja resumen con fórmulas)
4. [x] `app/Exports/OrdersExport.php` reescrito como `WithMultipleSheets`
5. [x] Verificar `AdminOrderController@export`

### Tarea 2 — Export de devoluciones
6. [x] `app/Exports/ReturnsDataSheet.php`
7. [x] `app/Exports/ReturnsSummarySheet.php`
8. [x] `app/Exports/ReturnsExport.php`
9. [x] `AdminReturnController@export` (nuevo)
10. [x] Ruta `GET /admin/returns/export`

### Tarea 3 — Export de preorders
11. [x] `app/Exports/PreordersDataSheet.php`
12. [x] `app/Exports/PreordersSummarySheet.php`
13. [x] `app/Exports/PreordersExport.php`
14. [x] `AdminPreorderController@export` (CSV → Excel)

### Tarea 4 — Export de newsletter
15. [x] `app/Exports/NewsletterDataSheet.php`
16. [x] `app/Exports/NewsletterSummarySheet.php`
17. [x] `app/Exports/NewsletterExport.php`
18. [x] `AdminNewsletterController@export` (CSV → Excel)

### Tarea 5 — Auditoría de formato visual
19. [x] Confirmar que los 4 exports usan `StylesExportSheet` de forma consistente
20. [x] Verificar manualmente (tinker o descarga real) que cabecera/zebra/freeze/formatos se ven
        correctamente en los 4 archivos

### Tarea 6 — Documentación y cierre
21. [x] `docs/021-excel-formulas.md`
22. [x] `php artisan test` (vía `docker compose exec backend`) — 19 fallidos / 43 pasados, mismos
        19 fallos preexistentes (`FanficTest`/`CheckoutTest`), sin fallos nuevos
23. [x] Verificar los criterios de aceptación uno a uno
24. [x] `git add . && git commit -m "feat: feature 021 completa — Excel con fórmulas y resumen" && git push`
