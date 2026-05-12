# Interval Atlas — Spec para Claude Code

> **Contexto**: Daniel tiene una suite de herramientas de guitarra en `tools/` con base sólida en `tools/shared/`. La SPA actual en `tools/intervallic.html` (con 5 módulos: chord-id, diatonic-lab, shape-lab, progression, triad-convergence) **se reemplaza completamente** por una sola herramienta nueva llamada **Interval Atlas**. Conservamos el archivo `intervallic.html` como punto de entrada pero su contenido se reescribe. La carpeta `intervallic/` se vacía y se reusa para los archivos nuevos.

---

## Objetivo del módulo

Una vista de los **22 trastes completos** donde cada nota se etiqueta con su función interválica (1, b2, 2, b3, 3, 4, b5, 5, b6, 6, b7, 7) **relativa a la raíz del acorde activo de una progresión**. Cuando la progresión avanza, todo el mástil se "repinta" mostrando cómo las mismas posiciones físicas cambian de función.

Pensado para improvisación: ver el contexto interválico móvil sobre cambios armónicos, no solo el voicing.

## Lo que NO es este módulo

- No es un editor de voicings.
- No es un identificador de acordes.
- No es un reproductor de progresiones con voice leading detallado de voicings.
- No reescribe ninguna primitiva de `shared/`.

## Cambios al árbol de archivos

### Archivos a eliminar

```
tools/intervallic/chord-id.js
tools/intervallic/diatonic-lab.js
tools/intervallic/shape-lab.js
tools/intervallic/progression.js
tools/intervallic/triad-convergence.js
tools/intervallic/shell.js
```

### Archivos a conservar

```
tools/intervallic/audio.js        ← se reusa tal cual (síntesis triangle, click)
tools/shared/*.js                  ← intactos, son la base
```

> Nota: `tools/shared/voicing-engine.js`, `voicing-templates.js`, `icl-state.js` quedan como están aunque ya no los use Interval Atlas — pueden seguir siendo útiles para otras herramientas (acordes.html, improvisar.html). No tocar.

### Archivos a crear

```
tools/intervallic/atlas.js         ← módulo principal (lógica + render)
tools/intervallic/atlas.test.js    ← tests puros (sin DOM)
```

### Archivos a reescribir

```
tools/intervallic.html             ← reescritura completa: una sola vista, sin tabs, sin shell
```

### Archivos a editar mínimamente

```
tools/index.html                   ← actualizar la card de "intervallic": nuevo título "Interval Atlas",
                                     nueva descripción, mantener la URL intervallic.html
tools/shared/theory.js             ← agregar helper intervalFromRoot
tools/shared/theory.test.js        ← tests del helper
```

## Reglas de oro (heredadas del proyecto)

- **Sin build step.** Funciona con `file://`. Solo `<script>` tags, IIFE, sin ES modules, sin bundlers.
- **Sin dependencias nuevas.** Vanilla JS + SVG.
- **Patrón IIFE**: `(function (G, W) { … W.IntervalAtlas = { init }; })(window.GuitarShared, window);`
- **No tocar el DOM en tests.** Tests corren con `shared/test-runner.js` y deben ser puros.
- **Reusar primitivas**: `FB.fbInitBoard`, `FB.fbGetDotsGroup`, `FB.fretX`, `FB.stringY`, `FB.INTERVAL_COLORS`, `POS.getAllScaleNotes`, `POS.noteAt`, `TH.buildChord`, `TH.pickScaleForChord`, `G.metronome.Metronome`, `W.IntervallicAudio.playPositions`.
- **Persistencia propia**: usar `localStorage` directamente con una key dedicada (`atlas_state`). No usar `iclState` (era del módulo anterior, queda intocado para no romper nada pero no se usa aquí).

## Modelo de datos

Los acordes ya están bien modelados por `TH.buildChord(root, quality)`. El módulo agrega una "vista" sobre ellos:

```js
// TH.buildChord('C', 'maj7') ya devuelve:
// { root: 'C', quality: 'maj7', notes: ['C','E','G','B'], intervals: ['1','3','5','7'] }

// Estado del módulo (persistido en localStorage como 'atlas_state'):
{
  progression: [
    { root: 'C', quality: 'maj7', bars: 1 },
    { root: 'A', quality: 'min7', bars: 1 },
    { root: 'D', quality: 'min7', bars: 1 },
    { root: 'G', quality: 'dom7', bars: 1 },
  ],
  activeIdx: 0,
  layers: {
    chordTones:  true,   // 1, 3, 5, 7 del acorde
    guideTones:  false,  // solo 3 y 7
    scale:       true,   // notas del modo asociado al acorde
    tensions:    false,  // 9, 11, 13 (con alteraciones según calidad)
    approach:    false,  // semitono arriba/abajo de cada chord tone
    allNotes:    false,  // las 12 notas con su intervalo (modo "ciego")
  },
  filter: {
    direction:    'all',    // 'all' | 'horizontal' | 'vertical' | 'diagonal'
    stringRange:  [1, 6],   // qué cuerdas mostrar (1=high e, 6=low E)
    fretRange:    [0, 22],  // ventana de trastes a iluminar
  },
  showNoteNames: false,
  parentKey: 'C',           // tonalidad madre (para deducir modos)
  parentMode: 'major',
  bpm: 80,
  beatsPerChord: 4,
}
```

## Fases incrementales (validar cada una antes de seguir)

### Fase 1 — Esqueleto + render con un solo acorde
- Reescribir `intervallic.html` con la estructura mínima (sin tabs, ver más abajo).
- Crear `intervallic/atlas.js` con `init()` que llama `FB.fbInitBoard(svg, 22)`.
- Selector simple de raíz + calidad para un solo acorde (sin progresión todavía).
- Pintar **todas** las posiciones cromáticas del mástil con su etiqueta interválica respecto a la raíz.
- Colores: usar `FB.INTERVAL_COLORS` para R/3/5/7 y definir un `INTERVAL_COLORS_FULL` local extendido para b2/2/4/b5/6 etc. (colores tenues para los no-chord-tone).
- Capa por defecto: `chordTones` activa, todo lo demás apagado.
- Toggle para mostrar el nombre de nota debajo del intervalo.

### Fase 2 — Editor de progresión
- UI para construir la progresión: dropdown de raíz (12 notas) + dropdown de calidad. **Calidades soportadas**: `major`, `minor`, `dim`, `aug`, `maj7`, `min7`, `dom7`, `m7b5`, `dim7`. Todas ya están en `TH.buildChord` (theory.js + theory-modes.js).
- Botón "+ agregar acorde", delete por chord, click sobre chord en la barra para activarlo.
- Botones `←` / `→` para navegar; atajos de teclado idem.
- Persistir progresión completa en `localStorage` bajo `atlas_state`. Por ahora un único slot; multi-slot puede esperar.

### Fase 3 — Capas (layers) intercambiables
- Toggles para cada capa de `state.layers`. Cuando se activa más de una, las capas se superponen con prioridad: chord tones > guide tones > tensions > scale > approach > all.
- **Guide tones**: filtra a 3 y 7 (incluye b3, b7). Render con borde más grueso o glow.
- **Scale**: usar `TH.pickScaleForChord(quality, {scaleAuto: true})` para deducir modo (jónico sobre maj7, mixolidio sobre dom7, dórico sobre m7, etc.), luego `POS.getAllScaleNotes(root, modeName, 22)`. Para dim7 y m7b5 usar `locrian` como fallback razonable (documentar la decisión en el código).
- **Tensions**: mapa fijo por calidad
  ```js
  const TENSIONS_BY_QUALITY = {
    maj7:  ['9', '#11', '13'],
    min7:  ['9', '11', '13'],
    dom7:  ['9', '#9', 'b9', '#11', '13', 'b13'],
    dim7:  ['9', '11', 'b13'],
    m7b5:  ['9', '11', 'b13'],
    major: ['9', '13'],
    minor: ['9', '11'],
    dim:   ['9', 'b13'],
    aug:   ['9', '#11'],
  };
  ```
  Mapear cada tensión al semitono correspondiente y pintar todas las posiciones del mástil con ese intervalo.
- **Approach**: para cada chord tone activo, pintar las notas a +1 y -1 semitono con color tenue y label "ap" o "→1/→3/→5/→7".
- **All notes**: las 12 notas con sus intervalos relativos, intensidad uniforme.

### Fase 4 — Reproducción + voice leading entre guide tones
- Reusar `G.metronome.Metronome` y `W.IntervallicAudio.playPositions`.
- Botón play / stop, input BPM (40-220), dropdown de compases por acorde (2/4/8).
- En cada cambio de acorde: repintar todo el mástil con los nuevos intervalos.
- En cada cambio, opcionalmente reproducir el acorde como bloque con `IntervallicAudio.playPositions` — para esto generar un "pseudo-voicing" simple: las notas del acorde en octava 4 con strings/frets aproximados (no hace falta usar voicing-engine).
- **Voice leading entre guide tones**: cuando se cumplen las dos condiciones — capa `guideTones` activa Y dos acordes consecutivos comparten un guide tone — dibujar una línea conectando esas posiciones en el mástil. El motivo más común es el ciclo descendente por quintas (ii-V-I) donde los guide tones bajan por semitonos.

### Fase 5 — Modo direccional
- Selector con 4 modos: `Todas`, `Horizontal`, `Vertical`, `Diagonal`.
- **Horizontal**: al hacer click en una nota, ilumina solo las notas del acorde/escala en esa misma cuerda. Botones para cambiar de cuerda.
- **Vertical**: ilumina solo en el mismo traste seleccionado.
- **Diagonal**: ilumina patrones en escalera tipo "two notes per string ascending" o "three notes per string ascending". Empezar con una sola escalera fija (ascendente, dos notas por cuerda) y permitir alternar dirección.

### Fase 6 — Filtros y refinamientos
- Range slider para limitar el rango de trastes mostrados (entrenar zonas tipo CAGED).
- Multi-select de cuerdas a mostrar.
- Botón "Limpiar todas las capas" / "Reset".
- Persistir `layers` + `filter` en `localStorage` para que el siguiente refresh recuerde el estado.

### Fase 7 (opcional, futura) — Detección de audio estilo Sølo
- Web Audio + Pitchy (CDN) para detectar la nota que el usuario está tocando.
- Modo "challenge": el módulo pide un intervalo específico del acorde activo (ej. "tocá el b7 de A m7"), espera la nota, solo avanza al siguiente acorde cuando se detecta correctamente.
- Implementar solo después de validar fases 1-6.

## Helper a agregar en `shared/theory.js`

```js
// Devuelve el nombre del intervalo entre rootNote y targetNote.
// '1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'
function intervalFromRoot(rootNote, targetNote) {
  const INTERVAL_NAMES = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
  const ri = CHROMATIC.indexOf(rootNote);
  const ti = CHROMATIC.indexOf(targetNote);
  if (ri < 0 || ti < 0) return null;
  return INTERVAL_NAMES[(ti - ri + 12) % 12];
}
```

Exponer en `G.theory.intervalFromRoot`. Agregar tests en `theory.test.js`.

## Estructura del HTML (intervallic.html reescrito)

El mástil es el foco central. Sidebar a la derecha en desktop, debajo en mobile. Sin tabs.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interval Atlas</title>
  <style>/* design system del proyecto: --bg, --surface, --gold, etc. */</style>
</head>
<body>
  <a href="index.html" class="back">← Volver</a>
  <h1>Interval Atlas</h1>
  <p class="subtitle">Intervalos del mástil sobre tu progresión, en todas las direcciones.</p>

  <div class="panel-layout">
    <div class="fretboard-wrap">
      <!-- Barra de progresión -->
      <div class="progression-bar" id="atlas-bar"></div>

      <!-- Transporte -->
      <div class="row">
        <button class="btn primary" id="atlas-play">▶ Play</button>
        <button class="btn" id="atlas-stop">■ Stop</button>
        <button class="btn" id="atlas-prev">←</button>
        <button class="btn" id="atlas-next">→</button>
        <label>BPM <input type="number" id="atlas-bpm" value="80" min="40" max="220" style="width:60px"></label>
        <label>Compases <select id="atlas-bpc"><option value="2">2</option><option value="4" selected>4</option><option value="8">8</option></select></label>
        <select id="atlas-direction">
          <option value="all">Dirección: Todas</option>
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
          <option value="diagonal">Diagonal</option>
        </select>
      </div>

      <!-- Capas -->
      <div class="layer-toggles">
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-chord" checked> Chord tones</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-guide"> Guide tones (3/7)</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-scale"> Escala asociada</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-tensions"> Tensiones</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-approach"> Notas de aproximación</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-l-all"> Todas las 12</label>
        <label class="layer-toggle"><input type="checkbox" id="atlas-show-names"> Mostrar nombres</label>
      </div>

      <svg id="atlas-fretboard" width="920" height="220"></svg>
      <div class="legend" id="atlas-legend"></div>
    </div>

    <div class="side-panel">
      <h3>Editor de progresión</h3>
      <div id="atlas-editor">
        <div class="row">
          <select id="atlas-new-root">
            <option>C</option><option>C#</option><option>D</option><option>D#</option>
            <option>E</option><option>F</option><option>F#</option><option>G</option>
            <option>G#</option><option>A</option><option>A#</option><option>B</option>
          </select>
          <select id="atlas-new-quality">
            <option value="maj7">maj7</option>
            <option value="min7">m7</option>
            <option value="dom7">7</option>
            <option value="dim7">dim7</option>
            <option value="m7b5">m7b5</option>
            <option value="major">Mayor</option>
            <option value="minor">menor</option>
            <option value="dim">dim</option>
            <option value="aug">aug</option>
          </select>
          <button class="btn primary" id="atlas-add">+ Agregar</button>
        </div>
        <div class="row" style="margin-top:8px">
          <label>Tonalidad madre
            <select id="atlas-parent-key">…12 notas…</select>
            <select id="atlas-parent-mode">…modos…</select>
          </label>
        </div>
      </div>

      <h3 style="margin-top:14px">Acorde activo</h3>
      <div id="atlas-info" class="empty-state">—</div>
    </div>
  </div>

  <script src="./shared/theory.js"></script>
  <script src="./shared/theory-modes.js"></script>
  <script src="./shared/fretboard.js"></script>
  <script src="./shared/storage.js"></script>
  <script src="./shared/positions.js"></script>
  <script src="./shared/metronome.js"></script>
  <script src="./intervallic/audio.js"></script>
  <script src="./intervallic/atlas.js"></script>

  <script>
    window.IntervalAtlas.init();
  </script>
</body>
</html>
```

Estilos: reusar variables CSS del proyecto. Copiar el header style de `intervallic.html` original (líneas 8-81) que ya tiene el look correcto. **Quitar** todo lo que era de tabs (`.tabs`, `.tab`, `.tab-content`).

## API pública del módulo

```js
window.IntervalAtlas = {
  init(),                          // setup: render, listeners, carga estado
  setProgression(chords),
  setActiveChord(idx),
  setLayer(name, enabled),
  setDirection(mode),
  getState(),                      // útil para tests / debug en consola
};
```

## Cambio a `index.html`

La card de "Intervallic Chord Lab" en `tools/index.html` (líneas ~322-327) se reescribe:

```html
<a href="intervallic.html" class="card" style="--accent: #f0c060;">
  <div class="card-icon">🗺️</div>
  <div class="card-title">Interval Atlas</div>
  <div class="card-desc">Visualizá los intervalos del mástil en los 22 trastes sobre una progresión de acordes. Capas para chord tones, guide tones, escala, tensiones y aproximación. Para improvisar con contexto armónico móvil.</div>
  <div class="card-fase">Improvisación · <strong>Intervalos · Progresiones · 22 trastes</strong></div>
</a>
```

## Tests obligatorios

`atlas.test.js` cubre lógica pura, sin DOM:

- `intervalFromRoot` (en `theory.test.js`): casos básicos + edge cases.
- Mapa de tensiones por calidad: dada una calidad, devuelve los semitonos correctos.
- Filtro de capas: dado un estado con varias capas activas, qué notas deben renderizarse y con qué prioridad.
- Approach notes: para cada chord tone, las posiciones a ±1 semitono son correctas en todas las cuerdas.
- Lógica de cambio de acorde: `setActiveChord(idx)` actualiza `activeIdx` y dispara recálculo de intervalos.
- Persistencia: serialización/deserialización de `state` con `localStorage` (mockeado).

## Lo que NO hacer

- No crear nuevo sistema de colores.
- No crear nuevo sistema de audio.
- No tocar `improvisar.html`, `acordes.html`, `escalas.html`, `diapason.html`, `oido.html`, `guia.html`.
- No tocar `shared/*` salvo agregar `intervalFromRoot` en `theory.js`.
- No agregar dependencias externas (jQuery, React, etc.).
- No introducir TypeScript ni build steps.

## Criterio de "terminado"

- Las fases 1-6 implementadas y testeadas.
- `atlas.test.js` pasa con `test-runner.js`.
- Se puede crear `Cmaj7 → Am7 → Dm7 → G7` y al darle play el mástil cambia coherentemente entre los 4 contextos interválicos.
- Toggles de capas funcionan acumulativamente con prioridad correcta.
- Selector de dirección filtra correctamente.
- Funciona offline (`file://`) sin errores en consola.
- La card de `index.html` apunta al nuevo Atlas y describe la herramienta nueva.

## Prompt sugerido para arrancar con Claude Code

> Soy Daniel. En esta carpeta `tools/` tengo una suite de herramientas de guitarra. La SPA en `tools/intervallic.html` ya no me sirve — la quiero **reemplazar completamente** por una herramienta nueva llamada **Interval Atlas**, conservando el nombre de archivo `intervallic.html`. El spec completo está en `INTERVAL_ATLAS_SPEC.md`. Leelo entero antes de tocar nada. Después, **mostrame un plan en fases con archivos a eliminar, crear y editar antes de codear**. Quiero validar cada fase por separado. Empezá por la Fase 1 cuando te dé el OK, no antes. Reusá toda la infraestructura de `tools/shared/` — no rescribas primitivas. No toques otras herramientas (`improvisar.html`, `acordes.html`, etc.).
