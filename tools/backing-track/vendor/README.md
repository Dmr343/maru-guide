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
