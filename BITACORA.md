# Bitácora — maru_guide


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
