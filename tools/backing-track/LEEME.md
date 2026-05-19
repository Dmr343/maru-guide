# Backing Track — módulo

Herramienta web de backing tracks (acompañamiento para improvisar).
Funciona abriendo `backing-track/index.html` directamente en el
navegador (`file://`, sin servidor).

## Estructura

- `backing-track/index.html` — entrada y **markup de toda la UI**
- `backing-track/styles.css` — **todos los estilos**
- `backing-track/app.js` — glue de la interfaz (arma el DOM dinámico:
  pistas, editores, indicadores)
- `backing-track/engine.js` — motor de audio (Tone.js)
- resto de `*.js` — lógica de datos/audio
- `backing-track/vendor/` — librerías (Tone.js, WebAudioFont)
- `shared/`, `intervallic/` — dependencias del repo que la página usa

## Para mejorar el apartado visual

Los archivos que importan son **`index.html`** (estructura) y
**`styles.css`** (estética). `app.js` genera DOM dinámico, así que
también influye en clases/estructura.

Restricciones a respetar:
- Sin build tooling, sin ES modules: debe seguir funcionando con
  `file://`. CSS y JS planos.
- Mantener los `id` de los elementos (el JS los referencia).
