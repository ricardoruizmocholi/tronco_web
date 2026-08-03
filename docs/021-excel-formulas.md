# 021 — Excel con Fórmulas y Resumen

## Resumen

Los 4 exports admin (pedidos, devoluciones, preorders, newsletter) pasan a Excel de dos hojas
(datos + resumen) con fórmulas Excel reales — no valores precalculados en PHP — y formato visual
consistente (cabecera oscura, zebra striping, freeze panes, formatos de número/fecha). Preorders y
newsletter dejan de ser CSV. El export de devoluciones no existía — se creó desde cero
(`GET /api/admin/returns/export`).

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `app/Exports/Concerns/StylesExportSheet.php` | Trait de formato visual compartido por las 8 hojas |
| `app/Exports/OrdersDataSheet.php` / `OrdersSummarySheet.php` | Hojas "Pedidos" / "Resumen" |
| `app/Exports/ReturnsDataSheet.php` / `ReturnsSummarySheet.php` / `ReturnsExport.php` | Export de devoluciones (nuevo) |
| `app/Exports/PreordersDataSheet.php` / `PreordersSummarySheet.php` / `PreordersExport.php` | Reemplaza el CSV de preorders |
| `app/Exports/NewsletterDataSheet.php` / `NewsletterSummarySheet.php` / `NewsletterExport.php` | Reemplaza el CSV de newsletter |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Exports/OrdersExport.php` | Reescrito: de `FromCollection` a orquestador `WithMultipleSheets` |
| `app/Http/Controllers/AdminReturnController.php` | Nuevo método `export()` |
| `app/Http/Controllers/AdminPreorderController.php` | `export()`: CSV a mano → `Excel::download()` |
| `app/Http/Controllers/AdminNewsletterController.php` | `export()`: CSV a mano → `Excel::download()` |
| `routes/api.php` | Nueva ruta `GET /admin/returns/export` |

---

## Qué fórmulas tiene cada export

### Pedidos
**Hoja "Pedidos"** (por fila, `{r}` = número de fila):
- `Total con IVA (21%)`: `=H{r}*1.21`
- `Comisión Stripe estimada`: `=H{r}*0.014+0.25`
- `Neto estimado`: `=H{r}-N{r}` (Total menos la comisión de la columna anterior)
- Fila de totales: `COUNTA` (nº pedidos), `SUM` de subtotal/envío/total/neto

**Hoja "Resumen"**: total de pedidos (`COUNTA`), pedidos por estado con `COUNTIF` + % (`IFERROR`
de la división), ingreso bruto y neto (`SUM`), ticket medio (bruto ÷ total), y un bloque "mes con
más ingresos": una fila `SUMIFS` por cada mes presente en los datos exportados +
`INDEX`/`MATCH` para encontrar el mes ganador.

### Devoluciones
**Hoja "Devoluciones"**: `Días hasta resolución` —
`=IF(J{r}<>"",DAYS(J{r},G{r}),IF(I{r}<>"",DAYS(I{r},G{r}),"Pendiente"))` — días desde la solicitud
(G) hasta el reembolso (J); si aún no hay reembolso, hasta la recepción (I); si tampoco, el texto
`"Pendiente"`.

**Hoja "Resumen devoluciones"**: total (`COUNTA`), por motivo y por estado (`COUNTIF`), tasa de
aprobación (aprobadas ÷ total), importe total reembolsado (`SUM`), tiempo medio de resolución
(`AVERAGE` sobre la columna de días — Excel ignora automáticamente las celdas con el texto
`"Pendiente"` al promediar).

### Preorders
**Hoja "Resumen preorders"**: total (`COUNTA`), tabla "por producto" (una fila `COUNTIF` + % por
cada producto distinto presente en los datos exportados), por estado (`COUNTIF`), tasa de
conversión (convertidos ÷ total).

### Newsletter
**Hoja "Resumen newsletter"**: total (`COUNTA`), suscritos este mes/año (`COUNTIFS` con
`DATE(YEAR(TODAY()),...)`), y crecimiento por mes: una fila `COUNTIFS` por cada uno de los últimos
6 meses naturales (mes actual + 5 anteriores, siempre los mismos 6, no depende de qué meses tengan
datos).

### Nota sobre la comisión de Stripe
La fórmula `H{r}*0.014+0.25` es una **estimación** basada en la tarifa estándar de Stripe para
tarjetas europeas (1,4 % + 0,25 €). La tarifa real varía según el tipo de tarjeta (débito/crédito,
UE/no UE), divisa, y los acuerdos específicos de la cuenta — para la comisión exacta de un cobro
concreto, consultar el dashboard de Stripe. Esta columna sirve para tener una idea rápida de
rentabilidad al exportar, no como dato contable definitivo.

---

## Cómo abrir correctamente los archivos

- **Excel** (Windows/Mac): doble click, abre directamente. Las fórmulas se recalculan solas.
- **LibreOffice Calc**: igual, doble click o `Abrir con`. Todas las fórmulas usadas
  (`SUM`, `COUNTA`, `COUNTIF`, `COUNTIFS`, `SUMIFS`, `AVERAGE`, `IFERROR`, `IF`, `DAYS`, `INDEX`,
  `MATCH`, `DATE`, `YEAR`, `MONTH`, `TODAY`) son estándar y funcionan igual en ambos programas.
- **Google Sheets**: al subir el archivo (`Archivo → Importar`), Google Sheets también recalcula
  las fórmulas correctamente — mismas funciones estándar.
- Si algún visor muestra las fórmulas como texto en vez de calcular el resultado, comprobar que el
  archivo se abrió como `.xlsx` (no renombrado a `.csv` ni abierto como texto plano).

---

## Cómo añadir columnas o fórmulas nuevas en el futuro

1. **Nueva columna de datos** (hoja de datos, p. ej. "Pedidos"): añadir el heading en
   `headings()` y el valor correspondiente en `map()`, en la misma posición. Si es una columna de
   dinero o fecha, añadir su letra a las constantes `MONEY_COLUMNS`/`DATE_COLUMNS` de esa clase.
2. **Nueva columna calculada con fórmula** (hoja de datos): en `map()`, usar `$row` (el número de
   fila actual, ya disponible en todas las `*DataSheet`) para construir el string de fórmula, p.
   ej. `"=H{$row}*1.05"`. Recordar: el string debe empezar por `=` para que PhpSpreadsheet lo trate
   como fórmula real, no como texto.
3. **Nueva fila en el Resumen**: en el método `array()` de la `*SummarySheet` correspondiente,
   añadir la fila con `$rows[] = ['Etiqueta', 'fórmula']` y guardar `count($rows)` si otra fórmula
   necesita referenciarla más adelante. **Nunca usar `$rows[] = [];`** para una fila en blanco —
   el writer de `maatwebsite/excel` la salta y desincroniza los números de fila de todas las
   fórmulas posteriores; usar `$rows[] = [null];`.
4. **Rango de las fórmulas del Resumen**: usar siempre el rango exacto
   (`Hoja!COL2:COLnúltimafila`, disponible vía `$this->lastDataRow` o el helper `$range()` ya
   presente en cada `*SummarySheet`), nunca un rango genérico enorme tipo `COL2:COL100000` — ver
   la nota en "Decisiones técnicas" sobre el agotamiento de memoria real que esto provoca.
5. **Nuevo export desde cero**: seguir el patrón de tres clases (`XxxExport` orquestador
   `WithMultipleSheets` + `XxxDataSheet` + `XxxSummarySheet`), reutilizando
   `App\Exports\Concerns\StylesExportSheet` para el formato visual.

---

## Decisiones técnicas

### 1. Rangos de fórmula exactos, nunca genéricos — probado con OOM real
El primer intento de `OrdersSummarySheet` usaba rangos abiertos tipo `Pedidos!H2:H100000` (para no
tener que sincronizar el número exacto de la última fila entre `OrdersDataSheet` y
`OrdersSummarySheet`). Al generar el archivo con `Excel::store()`, PHP agotó los 128 MB de memoria
del contenedor — `ShouldAutoSize` evalúa las fórmulas para medir el ancho de columna, y el motor de
cálculo puro-PHP de PhpSpreadsheet recorre literalmente el rango completo por cada `SUM`/`COUNTIF`,
algo que Excel real resuelve de forma dispersa y eficiente pero PhpSpreadsheet no. Solución:
`OrdersExport` (y el resto de orquestadores) consultan la colección **una sola vez** y la inyectan
en ambas hojas, de modo que el Resumen conoce el número exacto de filas y usa rangos acotados
(`H2:H12`, no `H2:H100000`).

### 2. Filas en blanco: `[null]`, nunca `[]`
Las filas espaciadoras entre secciones del Resumen se escribieron primero como `$rows[] = [];`.
El writer de `maatwebsite/excel` **salta silenciosamente** los arrays vacíos al escribir — no
generan una fila en blanco, simplemente no se escribe nada y la siguiente fila ocupa el hueco.
Esto desincronizaba `count($rows)` (que sí contaba la fila "fantasma") respecto a la fila real en
la hoja, así que todas las fórmulas con referencias relativas apuntaban a la celda equivocada.
Se detectó inspeccionando el archivo generado con PhpSpreadsheet (`getCell('A3')->getValue()`
no coincidía con lo esperado) y se corrigió sustituyendo `[]` por `[null]` — un array de un
elemento sí cuenta como fila real.

### 3. Consultas compartidas entre hoja de datos y hoja de resumen
Cada `*Export` orquestador (`OrdersExport`, `ReturnsExport`, `PreordersExport`,
`NewsletterExport`) consulta la base de datos una sola vez y pasa la misma `Collection` a las dos
hojas. Evita una segunda consulta idéntica y es lo que permite calcular `lastDataRow` de forma
fiable para los rangos exactos del punto 1. `PreordersSummarySheet` también reutiliza la colección
para enumerar los productos distintos (tabla "por producto") sin consultar la BD de nuevo.

### 4. Correcciones sobre los ejemplos de columna del encargo original
Los ejemplos de fórmulas del encargo usaban letras de columna que no coincidían con el orden de
columnas que el propio encargo especificaba (ver `spec/features/021-excel-formulas/spec.md` para
el detalle exacto). Se resolvieron por la posición real de cada columna en la hoja, verificado con
datos reales en cada caso — no por la letra literal del ejemplo.

### 5. Todas las fórmulas verificadas con datos reales, no solo con `php -l`
Cada una de las 4 hojas de datos y 4 hojas de resumen se generó realmente (vía
`Excel::store()` en `tinker`, dentro del contenedor Docker) y se releyó con
`PhpSpreadsheet::getCalculatedValue()` para comprobar que los números calculados eran coherentes
(ticket medio = bruto ÷ total, tasa de aprobación = aprobadas ÷ total, etc.) antes de dar cada
tarea por completada. Un archivo que solo pasa el linter de PHP puede tener fórmulas con la
sintaxis correcta pero que referencian la celda equivocada — algo que únicamente se detecta
generando el archivo de verdad.

---

## Cómo probar manualmente

1. **Pedidos**: `/admin/pedidos` → "Exportar Excel" → abrir el `.xlsx` → debe tener dos hojas,
   "Pedidos" con cabecera oscura y las 3 columnas de fórmulas (M, N, O) calculadas, fila de
   totales al final; "Resumen" con los totales en verde `#5BBB2A` y negrita.
2. **Devoluciones**: `GET /api/admin/returns/export` (no hay botón en el frontend, ver spec) →
   comprobar que descarga un `.xlsx` con "Devoluciones" y "Resumen devoluciones".
3. **Preorders**: `/admin/preorders` → exportar → el archivo debe ser `.xlsx` (ya no `.csv`).
4. **Newsletter**: `/admin/newsletter` → exportar → igualmente `.xlsx`.
5. **Editar y recalcular**: en cualquiera de los 4 archivos, cambiar un valor de la hoja de datos
   (p. ej. el Total de un pedido) y comprobar que las fórmulas de esa fila y las de la hoja Resumen
   que dependen de esa columna se actualizan solas al recalcular (Excel lo hace automáticamente;
   en LibreOffice puede requerir `Ctrl+Shift+F9` si el recálculo automático está desactivado).
6. `php artisan test` — sin fallos nuevos respecto al estado previo a esta feature.
