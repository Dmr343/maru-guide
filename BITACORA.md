# Bitácora — maru_guide


## 2026-03-31 | 12:48

**Resumen:** Se amplió la lógica de visualización de escalas para permitir hasta 3 notas por cuerda dentro de cada zona del mástil.

**Cambios:**
- Refactorización mayor de `tools/escalas.html`: +159 líneas, restructuración del algoritmo de zonas
- Actualizados `tools/acordes.html`, `diapason.html`, `guia.html`, `index.html`, `oido.html` con ajuste menor (+1 línea cada uno)

**Archivos clave:** `tools/escalas.html`, `tools/acordes.html`, `tools/diapason.html`

---

## 2026-03-31 | 12:47

**Resumen:** Se implementó lógica de zonas de fret por cuerda para garantizar orden ascendente de pitch en la visualización de escalas en el mástil.

**Cambios:**
- Rediseño del algoritmo de mapeo escala→mástil usando rangos de fret por cuerda (E:[1-4], A:[2-6], D:[4-8], G:[6-10], B:[7-11], e:[10-12])
- Las zonas se solapan intencionalmente para que el pitch siempre sea ascendente entre cuerdas sin necesidad de ordenar explícitamente
- Refactorización de `tools/escalas.html` con 159 inserciones y 48 eliminaciones

**Archivos clave:** `tools/escalas.html`, `tools/diapason.html`, `tools/acordes.html`

---

## 2026-03-31 | 12:05

**Resumen:** Se corrigió el algoritmo de visualización diagonal de escalas en el mástil para eliminar cuerdas al aire y distribuir las notas proporcionalmente desde la raíz.

**Cambios:**
- Filtro `fret >= 1` para excluir notas en cuerda al aire del diagrama
- Cálculo de avance proporcional por cuerda basado en `(12 - startFret) / 5`
- Ventana de búsqueda adaptativa centrada en el punto exacto de cada cuerda

**Archivos clave:** `tools/escalas.html`

---

## 2026-03-31 | 11:49

**Resumen:** Se implementó el modo "Recorrido Diagonal" en el visualizador de escalas, que muestra un camino secuenciado de notas conectadas en diagonal a través del diapasón con indicadores de slide.

**Cambios:**
- Añadido toggle `↗ Diagonal · OFF/ON` que activa vista de recorrido diagonal en el mástil
- Las notas fuera del recorrido se muestran tenues como contexto visual
- Línea punteada conecta las notas del recorrido de izquierda a derecha
- Numeración secuencial (1, 2, 3…) visible en cada nota del camino
- Indicador `↗` en cyan marca transiciones de cuerda donde se aplica slide

**Archivos clave:** `tools/escalas.html`

---

## 2026-03-31 | 10:50

**Resumen:** Se refinó la interfaz de la herramienta de escalas para simplificar la navegación y mejorar la visualización de fórmulas de escalas.

**Cambios:**
- Reducida la barra de tabs a solo 3 vistas: Calcular, Quiz y Editor (eliminadas Visualización y Conectar)
- Calcular establecida como tab activa por defecto al cargar la página
- Agregados 4 tipos de escala: Mayor, Penta Mayor, Menor, Penta Menor
- La fórmula muestra intervalos con notación T/S/m3 entre cada nota de la escala

**Archivos clave:** `tools/escalas.html`

---

## 2026-03-31 | 10:45

**Resumen:** Consulta técnica sobre la estructura de escalas pentatónicas (mayor y menor) y su visualización en el diapasón SVG del modo Calcular.

**Archivos clave:** `guia_guitarra.md`

---

## 2026-03-31 | 10:40

**Resumen:** Sesión de consulta teórica sobre la construcción de la escala pentatónica menor y su relación con la escala menor natural.

**Archivos clave:** _(sin modificaciones)_

---

## 2026-03-31 | 10:32

**Resumen:** Sesión de consulta teórica sobre la escala pentatónica menor y su aplicabilidad para improvisar en guitarra.

**Archivos clave:** *(sin modificaciones)*

---

## 2026-03-30 | 18:21

**Resumen:** Se implementó el modo "Calcular" en la app de escalas, permitiendo derivar cualquier escala Mayor o Menor desde una raíz elegida directamente en el diapasón.

**Cambios:**
- Nuevo tab "Calcular" en `escalas.html` con toggle Mayor/Menor
- Fórmula de intervalos mostrada abstractamente antes de seleccionar raíz (`T — T — S — T — T — T — S`)
- Click en cualquier nota del mástil la establece como raíz y completa la fórmula con notas reales
- Todas las posiciones de las 7 notas de la escala se iluminan en el mástil completo
- La raíz se destaca visualmente con tamaño mayor y glow; cada nota muestra nombre y grado (1-7)

**Archivos clave:** `escalas.html`

---

## 2026-03-30 | 17:52

**Resumen:** Se corrigió la orientación del diapasón en los diagramas SVG para que la cuerda 6 (grave) quede abajo y la cuerda 1 (aguda) quede arriba, alineándose con la tablatura estándar.

**Cambios:**
- Invertida la fórmula `stringY(si)` de `STRING_TOP + si * STRING_GAP` a `STRING_BOT - si * STRING_GAP`
- Corrección aplicada en dos diagramas independientes dentro del ecosistema de apps

**Archivos clave:** `guia_guitarra.md`

---

## 2026-03-30 | 16:46

**Resumen:** Se corrigió la posición de la escala Sol Mayor Jónica en el visualizador y se agregó un modo Editor de escalas con persistencia en localStorage.

**Cambios:**
- Escala Sol Mayor Jónica corregida: inicia en traste 3 cuerda 6 (nota G)
- Nuevo tab "Editor" en el visualizador de escalas
- Editor permite asignar grados (1–7) y colocar/borrar notas en el diapasón
- Acciones de guardar, limpiar y restablecer defaults implementadas

**Archivos clave:** `guia_guitarra.md`

---

## 2026-03-30 | 16:29

**Resumen:** Se publicó el ecosistema de aprendizaje de guitarra en GitHub, incluyendo una guía completa en Markdown y cinco aplicaciones HTML interactivas.

**Cambios:**
- Creado repositorio público `Dmr343/maru-guide` con guía offline y hub de herramientas
- Implementadas 5 apps independientes: diapasón, escalas, acordes, entrenamiento de oído y guía interactiva con progreso
- Configurado `.gitignore` para excluir PDFs y transcripts de material de terceros
- Preparada la estructura para activación de GitHub Pages desde `tools/`

**Archivos clave:** `guia_guitarra.md`, `tools/index.html`, `tools/diapason.html`, `tools/escalas.html`, `tools/acordes.html`, `tools/oido.html`, `tools/guia.html`

---

## 2026-03-30 | 16:29

**Resumen:** Se publicó el ecosistema de aprendizaje de guitarra en GitHub, incluyendo una guía completa en Markdown y cinco aplicaciones HTML interactivas.

**Cambios:**
- Creado repositorio público `Dmr343/maru-guide` con guía offline y hub de herramientas
- Implementadas 5 apps independientes: diapasón, escalas, acordes, entrenamiento de oído y guía interactiva con progreso
- Configurado `.gitignore` para excluir PDFs y transcripts de material de terceros
- Preparada la estructura para activación de GitHub Pages desde `tools/`

**Archivos clave:** `guia_guitarra.md`, `tools/index.html`, `tools/diapason.html`, `tools/escalas.html`, `tools/acordes.html`, `tools/oido.html`, `tools/guia.html`

---
