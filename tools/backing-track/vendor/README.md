# Dependencias vendorizadas

Estas librerías se guardan en el repo (no se cargan por CDN) para que el módulo
de backing tracks funcione abriendo el HTML directamente (`file://`), sin
servidor ni conexión a internet. Ver memoria `file_protocol.md` del proyecto.

## Tone.js

- **Versión:** 14.8.49
- **Build:** UMD (expone el global `window.Tone`, sin ES modules).
- **Origen:** https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js
- **Licencia:** MIT — © Yotam Mann. https://github.com/Tonejs/Tone.js

Para actualizar: descargar la nueva build UMD, reemplazar `Tone.js` y actualizar
la versión de arriba. No usar la build ESM (`type="module"` rompe `file://`).

## WebAudioFontPlayer.js

- **Qué es:** reproductor de soundfonts General MIDI (instrumentos reales:
  sitar, koto, shamisen, etc.). Build clásica, expone el global
  `WebAudioFontPlayer`.
- **Origen:** https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js
- **Licencia:** MIT — © Sergey Surikov. https://github.com/surikov/webaudiofont

Solo el reproductor se vendoriza. Los datos de cada instrumento (los
soundfonts) se cargan por CDN desde `surikov.github.io/webaudiofontdata`
cuando se usa un preset con `motor: 'webaudiofont'` — requieren internet.
