# Prompt Maestro — Intervallic Chord Lab (v3)

> **Nota de versión**: Esta es la v3. Cambios respecto a v2:
> - Restricción crítica nueva: **los voicings se construyen desde la raíz hacia los agudos**. Raíz en bajo, voicing crece hacia cuerda 1, cuerdas más graves que la raíz se enmudecen.
> - Restricción nueva: **el voicing debe incluir al menos una nota en cuerdas 1-3 (zona aguda)**. Voicings restringidos a cuerdas 4-5-6 quedan fuera (otra herramienta los cubre).
> - **Generación de voicings basada en templates**, no en enumeración exhaustiva. Esto evita la explosión combinatoria.
> - Default del chord ID cambia: identifica acordes por contenido de notas, no por inversión. Modo "tratar nota más grave como raíz" pasa a toggle opcional.
> - Sección nueva (4.6): catálogo de voicing templates predefinidos.

> **Instrucciones para Claude Code**: Este documento describe una herramienta nueva para añadir al repositorio de guitarra existente. Quiero que sigas este flujo: `/write-a-prd` → `/grill-me` → `/prd-to-issues` → `/improve-codebase-architecture` → `/tdd`. Este documento es la fuente de verdad para el PRD inicial. No empieces a codear nada hasta que las cinco fases estén escritas y aprobadas.

---

## 1. Contexto y motivación

Ya construimos una herramienta CAGED que funciona, pero CAGED como sistema de aprendizaje resulta limitado: las posiciones son demasiado complejas o no se conectan musicalmente entre sí. Quiero construir una herramienta nueva basada en **visualización intervalica** y en un método propio para construir vocabulario de acordes diatónicos.

El método se basa en estas observaciones:

1. En cualquier posición de una escala diatónica, las raíces de los acordes diatónicos forman patrones geométricos en el mástil (lo que yo llamo "triángulos").
2. Las raíces se pueden agrupar por cualidad de acorde: 3 menores, 3 mayores, 1 disminuido (en escala mayor / menor natural).
3. Sobre cada raíz se construye un voicing siguiendo reglas estrictas:
   - **La raíz es la nota más grave del voicing.**
   - **El voicing crece hacia los agudos**: cuerdas con número menor que la cuerda de la raíz.
   - **El voicing debe alcanzar la zona aguda** (al menos una nota en cuerdas 1, 2 o 3).
4. Estos voicings se eligen de un set curado de **templates** (formas) predefinidas, no se generan exhaustivamente. Esto evita ofrecer 50 opciones cuando solo 2-3 son musicalmente útiles.
5. Algunos templates incluyen cejilla parcial (cuando varias cuerdas comparten traste), otros no. La cejilla es **emergente**, no obligatoria.
6. A medida que se sube por el mástil, los voicings se reducen a tríadas en las cuerdas agudas.

## 2. Objetivos del producto

**Objetivo primario**: Construir vocabulario de voicings diatónicos por posición de escala, restringidos a las reglas de construcción del método (raíz en bajo, voicing hacia agudos, alcance a zona aguda), que sirvan tanto para acompañamiento como para improvisación.

**Objetivos secundarios**:
- Identificar acordes a partir de notas seleccionadas en el mástil (chord ID inverso).
- Visualizar voice leading entre acordes diatónicos consecutivos.
- Conectar voicings de acordes con escalas de improvisación.
- Permitir trabajar con la escala sola (sin foco en acordes) cambiando entre posiciones del mástil.
- Permitir definir voicing templates personalizados y aplicarlos a cualquier raíz.

**No son objetivos** (por ahora):
- Voicings con la raíz en cuerdas distintas al bajo (inversiones en bajo). Son útiles musicalmente pero ya hay otra herramienta que los cubre.
- Voicings restringidos a cuerdas graves 4-5-6 (rhythm guitar voicings). Otra herramienta los cubre.
- Spaced repetition o tracking de progreso.
- Estadísticas de práctica.
- Reconocimiento de audio.
- Tablatura exportable a PDF.
- Acordes con extensiones complejas (9, 11, 13, alterados). Limitarse a tríadas y tétradas básicas: mayor, menor, disminuido, aumentado, mayor 7, menor 7, dominante 7, semidisminuido (m7b5).
- Afinaciones alternativas en MVP.

## 3. Usuario y contexto de uso

**Usuario**: Guitarrista intermedio que ya tiene fundamentos de teoría (intervalos, escalas diatónicas, construcción de acordes) y quiere romper la meseta intermedia conectando teoría con fretboard, particularmente para improvisación. Estudia rock, blues, psicodélico, metal. Practica en sesiones cortas (20–60 min). Su guitarra tiene 22 trastes.

**Contexto de uso típico**: Sesión de práctica deliberada. Abre la herramienta en navegador, elige tonalidad y posición, explora un módulo durante 15–30 minutos enfocado en una habilidad específica.

## 4. Concepto musical fundamental

### 4.1. Posición de escala

Una **posición de escala** es una región del mástil de aproximadamente 4–5 trastes donde se puede tocar la escala completa sin desplazar la mano. Para cada tonalidad y modo, hay típicamente 5 posiciones (las cinco cajas de la pentatónica extendidas a la escala diatónica). La herramienta debe permitir también:

- **Posición arbitraria**: el usuario indica un traste de inicio (ej: traste 7) y la herramienta resuelve qué notas de la escala caen en los siguientes 4–5 trastes a partir de ahí.
- **Posición octavada**: las 5 posiciones estándar también existen una octava más arriba (en general, 12 trastes más arriba). La herramienta debe poder mostrar la "misma" posición en su versión grave o aguda.

### 4.2. Raíces diatónicas en una posición

Para una escala diatónica, dentro de cualquier posición, las raíces de los 7 acordes diatónicos están distribuidas en lugares fijos del mástil. Esos puntos forman un patrón geométrico característico.

### 4.3. Triángulos por cualidad

Las 7 raíces se agrupan por cualidad del acorde:

- **En escala mayor**: I, IV, V son mayores; ii, iii, vi son menores; vii° es disminuido.
- **En escala menor natural (Aeólico)**: III, VI, VII son mayores; i, iv, v son menores; ii° es disminuido.
- **Otros modos**: distribución equivalente pero rotada.

Las 3 raíces mayores forman un triángulo en el mástil, las 3 menores forman otro, y la disminuida queda como punto suelto. Estos "triángulos" son visualizaciones del patrón geométrico, no triángulos perfectos en sentido estricto. **Los triángulos son una capa visual opcional, no un requisito permanente** — el usuario debe poder apagarlos para trabajar con la escala sola.

### 4.4. Reglas de construcción de voicings (CRÍTICO)

Los voicings de esta herramienta siguen tres reglas estrictas. Cualquier voicing generado debe cumplir las tres:

**Regla 1 — Raíz en el bajo**
La nota más grave del voicing es la raíz del acorde. No se generan voicings con la 3ra o 5ta como nota más grave (no hay inversiones en bajo).

**Regla 2 — Voicing hacia los agudos**
Una vez determinada la cuerda donde está la raíz (cuerda raíz), el voicing usa solo las cuerdas con número ≤ cuerda raíz (es decir, cuerdas más agudas que la raíz, incluyendo la propia). Las cuerdas más graves que la raíz se enmudecen y no suenan.

Ejemplos:
- Si la raíz está en cuerda 6 (low E), el voicing puede usar cuerdas 6, 5, 4, 3, 2, 1.
- Si la raíz está en cuerda 5 (A), el voicing usa cuerdas 5, 4, 3, 2, 1; cuerda 6 se enmudece.
- Si la raíz está en cuerda 4 (D), el voicing usa cuerdas 4, 3, 2, 1; cuerdas 6 y 5 se enmudecen.
- Si la raíz está en cuerda 3 (G), el voicing usa cuerdas 3, 2, 1; cuerdas 6, 5, 4 se enmudecen.

**Regla 3 — Alcance a zona aguda**
El voicing debe incluir al menos una nota en cuerdas 1, 2 o 3 (las tres cuerdas agudas). Voicings que se quedan en cuerdas 4-5-6 sin tocar zona aguda no son válidos en esta herramienta.

Esto excluye explícitamente:
- Tríadas en cuerdas 4-5-6 (R+3+5 todas en bajo).
- Voicings que usan solo cuerdas 5-6.
- Voicings de "rhythm guitar" estilo power chord con octavas en bajo.

Esos voicings son útiles musicalmente pero ya hay otra herramienta que los cubre.

### 4.5. Cejilla emergente

Cuando varias notas del voicing comparten traste y cuerdas adyacentes, naturalmente requieren cejilla parcial. Cuando cada nota está en un traste distinto, no hay cejilla. La cejilla es una **consecuencia** de la digitación, no un requisito previo.

Ejemplos concretos:

**Con cejilla** — Am en posición 5 (E-shape barre):
- Cejilla en traste 5 cubriendo cuerdas 6, 3, 2, 1.
- Dedo 3 en traste 7 cuerda 5 (E, la 5ta).
- Dedo 4 en traste 7 cuerda 4 (A, la octava).
- Notas: A, E, A, C, E, A → A menor con raíz en cuerda 6.
- **Cumple las 3 reglas**: raíz en bajo (cuerda 6), voicing hacia agudos (usa 6 a 1), alcanza cuerdas 1-3.

**Sin cejilla** — Tríada Am en cuerdas 1-2-3 (alta):
- Dedo 3 en traste 14 cuerda 3 (A, la octava — esta es la "raíz" del voicing).
- Wait — la raíz tendría que estar en la cuerda más grave del voicing. Si vamos a usar solo cuerdas 1-2-3, la raíz va en cuerda 3.
- Dedo 1 en traste 14 cuerda 3 (A — raíz, en bajo del voicing).
- Dedo 2 en traste 13 cuerda 2 (C — b3, una posición arriba).
- Dedo 3 en traste 12 cuerda 1 (E — 5ta).
- Notas: A, C, E → A menor en raíz, voicing en cuerdas agudas.
- Cuerdas 6, 5, 4 enmudecidas.
- **Cumple las 3 reglas**: raíz en bajo del voicing (cuerda 3), voicing hacia agudos (3, 2, 1), alcanza cuerdas 1-3.

**Sin cejilla** — Am7 drop-2 en cuerdas 4-3-2-1:
- Cuerda 4 fret 7: A (raíz).
- Cuerda 3 fret 5: C (b3).
- Cuerda 2 fret 8: G (b7).
- Cuerda 1 fret 5: E (5).
- Cuatro frets distintos, sin cejilla.
- **Cumple las 3 reglas**: raíz en bajo (cuerda 4), voicing hacia agudos, incluye cuerdas 1 y 2.

### 4.6. Catálogo de voicing templates

La herramienta no genera voicings exhaustivamente. Tiene un set curado de templates predefinidos. Cuando el usuario pide voicings para un acorde en una posición, la herramienta busca qué templates caben y devuelve 1-3 opciones.

**Templates de voicings completos (con cejilla emergente)**:

| ID | Nombre | Raíz en cuerda | Cuerdas usadas | Para cualidades | Cejilla típica |
|----|--------|----------------|-----------------|-----------------|----------------|
| `e-shape-maj` | E-shape Mayor | 6 | 6,5,4,3,2,1 | major | Sí |
| `e-shape-min` | E-shape menor | 6 | 6,5,4,3,2,1 | minor | Sí |
| `e-shape-7` | E-shape 7 | 6 | 6,5,4,3,2,1 | dom7 | Sí (con omisión en cuerda 4) |
| `e-shape-m7` | E-shape m7 | 6 | 6,5,4,3,2,1 | m7 | Sí |
| `e-shape-maj7` | E-shape maj7 | 6 | 6,5,4,3,2,1 | maj7 | Sí |
| `a-shape-maj` | A-shape Mayor | 5 | 5,4,3,2,1 | major | Sí |
| `a-shape-min` | A-shape menor | 5 | 5,4,3,2,1 | minor | Sí |
| `a-shape-7` | A-shape 7 | 5 | 5,4,3,2,1 | dom7 | Sí |
| `a-shape-m7` | A-shape m7 | 5 | 5,4,3,2,1 | m7 | Sí |
| `a-shape-maj7` | A-shape maj7 | 5 | 5,4,3,2,1 | maj7 | Sí |
| `d-shape-maj` | D-shape Mayor | 4 | 4,3,2,1 | major | Parcial o no |
| `d-shape-min` | D-shape menor | 4 | 4,3,2,1 | minor | Parcial o no |

**Templates de voicings reducidos (sin cejilla típica)**:

| ID | Nombre | Raíz en cuerda | Cuerdas usadas | Para cualidades | Notas |
|----|--------|----------------|-----------------|-----------------|-------|
| `triad-321-root` | Tríada cuerdas 3-2-1, raíz en 3 | 3 | 3,2,1 | major, minor | 3 inversiones |
| `triad-432-root` | Tríada cuerdas 4-3-2, raíz en 4 | 4 | 4,3,2 | major, minor | 3 inversiones |
| `drop2-1234-root5` | Drop-2 cuerdas 1-2-3-4, raíz en cuerda 5 que se omite | 4 | 4,3,2,1 | maj7, m7, dom7 | Sin cejilla típicamente |

**Templates de shell voicings (3 notas: R, 3, 7)**:

| ID | Nombre | Raíz en cuerda | Cuerdas usadas | Para cualidades | Notas |
|----|--------|----------------|-----------------|-----------------|-------|
| `shell-643` | Shell raíz cuerda 6 | 6 | 6, 4, 3 | maj7, m7, dom7 | Cejilla parcial a veces |
| `shell-532` | Shell raíz cuerda 5 | 5 | 5, 3, 2 | maj7, m7, dom7 | Sin cejilla típicamente |

**Reglas de selección de templates**:

1. Para cada acorde diatónico en una posición de escala, la herramienta enumera qué templates pueden aplicarse:
   - El template aplica si la raíz del acorde está disponible en la cuerda raíz del template, dentro de la posición.
   - El voicing resultante (al aplicar el template) debe estar dentro de la posición o como mucho extenderse 2 trastes fuera.
2. Devuelve los templates aplicables ordenados por:
   - Voicings completos primero (más notas).
   - Voicings de cejilla CAGED-derived antes que voicings reducidos.
   - Si hay 3+ aplicables, mostrar al usuario solo los 2 más naturales.
3. El usuario puede pedir "ver más voicings" para acceder a templates adicionales aplicables.

### 4.7. Repetición y convergencia

El mismo template puede aplicarse en otras zonas del mástil (cuando la raíz aparece en otra octava). A medida que se sube por el mástil, los templates de voicings completos dejan de caber y los templates reducidos toman protagonismo. Esto crea la "convergencia" hacia tríadas en zona aguda que el método busca enseñar.

## 5. Módulos del programa

La herramienta tiene 5 módulos. Todos comparten el mismo componente de mástil renderizado (reusar `fbInitBoard` y derivados del codebase existente, extendido para 22 trastes).

### Módulo 1 — Chord ID (Identificador inverso)

**Función**: El usuario selecciona notas en el mástil y la herramienta identifica qué acorde(s) podrían formar.

**Comportamiento**:
- Click sobre un traste/cuerda → se ilumina la nota seleccionada.
- Click de nuevo sobre la misma → se deselecciona.
- Botón "Limpiar" para resetear la selección.
- Cuando hay 2 o más notas seleccionadas, el panel lateral muestra interpretaciones ranqueadas.

**Interpretaciones**:
- Cada interpretación incluye:
  - Nombre del acorde (ej: "C major", "Am7").
  - Etiquetado de chord tones sobre las notas seleccionadas (R, 3, 5, b7).
  - Indicador de qué notas faltan para completar el acorde (en gris).
  - Lista de escalas en las que ese acorde es diatónico.
  - Indicador de si el voicing seleccionado matchea algún template del catálogo (sección 4.6).

**Ranking de interpretaciones** (orden de prioridad):
1. Acordes que matchean exactamente un template del catálogo.
2. Tríadas y tétradas básicas completas con todas las notas usadas.
3. Acordes que coinciden con la escala seleccionada en otros módulos (si hay).
4. Acordes con notas omitidas (ej: 7th chord sin 5ta).
5. Interpretaciones más exóticas (sus, add, etc.).

**Toggle "modo inversión"** (off por defecto):
- OFF (default): identifica el acorde por contenido de pitch class, ignorando qué nota es la más grave. C-E-G es siempre "C major" sin importar cuál esté en bajo.
- ON: si la nota más grave no es la raíz del acorde, lo nombra como slash chord (ej: C/E). Útil para análisis musical pero no es el caso de uso principal.

**UI**:
- Panel principal: mástil completo, **22 trastes visibles**, todas las cuerdas.
- Panel lateral: lista de interpretaciones, top 5 visibles, expandible para más.

### Módulo 2 — Diatonic Lab (el corazón del método)

**Función**: Visualizar una posición de escala con la opción de superponer las raíces de los 7 acordes diatónicos agrupadas por cualidad, y explorar voicings construidos sobre cada raíz aplicando templates del catálogo.

**Inputs**:
- Tonalidad (12 opciones: C, C#, D, ..., B).
- Modo / escala (mayor, menor natural, menor armónica, menor melódica, dórico, frigio, lidio, mixolidio, locrio).
- Posición:
  - Posiciones estándar 1–5 (cajas pentatónicas extendidas).
  - Posición libre por traste de inicio (ej: "empezar en traste 7").
  - Toggle "octava arriba" (mover la posición 12 trastes hacia el agudo).

**Sistema de capas visuales**:

- **Capa 1 — Escala (siempre activa)**: notas de la escala dentro de la posición elegida, en tono tenue. Notas fuera de la posición se muestran muy desaturadas (alpha 0.15).
- **Capa 2 — Raíces diatónicas (toggle ON/OFF)**: raíces de los 7 acordes diatónicos resaltadas con círculos coloreados:
  - **Verde** = acordes mayores (3 raíces).
  - **Azul** = acordes menores (3 raíces).
  - **Amarillo/naranja** = acorde disminuido (1 raíz).
  - Cada raíz tiene label flotante: "I (Cmaj)", "ii (Dm)", etc.
- **Capa 3 — Triángulos (toggle ON/OFF, depende de Capa 2)**: líneas semitransparentes conectando las 3 raíces de cada cualidad.
- **Capa 4 — Voicing activo (al hacer click en una raíz)**: el voicing específico del acorde clickeado, con notas en color fuerte, chord tones etiquetados (R, 3, 5, etc.), y cejilla dibujada si aplica.

**Modo "solo escala"**: con Capas 2 y 3 apagadas, queda solo la escala en posición. Sirve para practicar movimientos por el mástil sin foco en acordes.

**Modo "transición entre posiciones"**: botón "ir a posición siguiente" que anima la transición de pos 5 → 9 → 12 → 17. Muestra cómo la misma escala se distribuye en distintas zonas del mástil.

**Click sobre una raíz** → panel lateral con voicings sugeridos para ese acorde.

Cada voicing en el panel:
- Mini-diagrama de acorde mostrando dedos y cejilla (si la hay).
- Etiqueta del template usado (ej: "E-shape minor" o "Triada cuerdas 3-2-1, primera inversión").
- Etiquetas de cuerdas con nombre de nota y de chord tone (R, 3, 5, etc.).
- Indicador "con cejilla" o "sin cejilla".
- Botón "Tocar" (audio sintético, opcional).
- Botón "Agregar a progresión".

**Generación de voicings**: La herramienta enumera templates aplicables (ver sección 4.6), elige top 2-3 según ranking, y los muestra. No enumera todas las posibilidades de digitación. Botón "Ver más" expande a templates adicionales aplicables.

### Módulo 3 — Shape Lab (Templates personalizados)

**Función**: Permite al usuario definir templates de voicing propios y agregarlos al catálogo de la herramienta.

**Definir un template**:
- Especificar:
  - Cuerda raíz (1-6).
  - Cuerdas usadas (subset de cuerdas ≥ cuerda raíz).
  - Para cada cuerda usada: qué intervalo desde la raíz suena ahí (R, b3, 3, 4, b5, 5, 6, b7, 7, octava).
  - Posición relativa de cada nota en trastes (relativo a la raíz).
  - Cualidades para las que el template aplica (major, minor, etc.).
- **Validación automática**: el sistema verifica que el template cumple las 3 reglas (sección 4.4):
  - Raíz en bajo del voicing.
  - Solo usa cuerdas ≤ cuerda raíz.
  - Incluye al menos una nota en cuerdas 1-3.
- Si no cumple, muestra error con mensaje claro y no permite guardar.

**UI de definición**:
- Mástil interactivo donde el usuario selecciona la raíz y luego marca cada nota del voicing eligiendo el intervalo de un dropdown.
- O importar desde el Módulo 1 (al identificar un acorde, botón "guardar como template"). El sistema valida las 3 reglas antes de permitir importar.

**Aplicación**:
- Una vez definido el template, aparece en el catálogo del Módulo 2.
- Cuando se selecciona una raíz diatónica que matchea las cualidades del template, este se vuelve aplicable.

**Biblioteca**:
- Templates predefinidos: ver sección 4.6.
- Templates personalizados: guardados en localStorage.

### Módulo 4 — Progression Player

**Función**: Definir una progresión de acordes diatónicos y reproducirla con metrónomo, mostrando voicings sugeridos en una posición elegida y resaltando voice leading.

**Definir progresión**:
- Tonalidad y modo.
- Acordes uno por uno desde la lista diatónica (I, ii, iii, IV, V, vi, vii°).
- Duración de cada acorde en compases.
- Soporta progresiones simples (4 acordes) y complejas (12+ acordes).

**Posición fija**:
- El usuario elige una posición de escala.
- Para cada acorde, la herramienta resuelve el voicing más natural en esa posición usando templates aplicables.
- Si hay múltiples templates posibles, default al primero rankeado, pero el usuario puede cambiarlo manualmente para cada acorde.
- **Restricción crítica**: los voicings deben mantenerse dentro de la posición.

**Reproducción**:
- Metrónomo con BPM ajustable (60–180).
- Compás (4/4 default, 3/4 y 6/8 opcionales).
- Acorde actual resaltado con animación de pulso al inicio de cada compás.
- Acordes próximos visibles en cola lateral.

**Voice leading visual**:
- Notas comunes entre acordes consecutivos: se mantienen visibles, color persistente.
- Notas que cambian: fade out / fade in con transición ~200ms.
- Notas que se mueven medio tono o tono entero: línea curva animada.

**Modo práctica**:
- "Solo metrónomo": no se reproduce audio, el usuario toca.
- "Audio + metrónomo": acorde sintetizado para referencia.
- "Looper": progresión repetida indefinidamente.

### Módulo 5 — Triad Convergence

**Función**: Mostrar las 3 inversiones de cada tríada diatónica en cuerdas 1-2-3 (G-B-E) y opcionalmente 2-3-4 (D-G-B) a lo largo del mástil, conectando vocabulario de acordes con vocabulario de soloing.

**Conjuntos de cuerdas soportados**:
- **Cuerdas 1-2-3 (E-B-G)**: tríadas en zona aguda. Ideal para fills melódicos sobre solos.
- **Cuerdas 2-3-4 (B-G-D)**: tríadas en zona media-alta. Útil para acompañamiento.
- **Cuerdas 3-4-5 (G-D-A) y 4-5-6 (D-A-E)**: NO se incluyen. Son tríadas en zona grave que están fuera del scope de esta herramienta.

**Visualización**:
- Mástil completo, **22 trastes** (crítico: las inversiones agudas viven entre los trastes 12-22).
- El usuario elige tonalidad, modo y conjunto de cuerdas (1-2-3 o 2-3-4, default 1-2-3).
- Se muestran las 3 inversiones de cada tríada diatónica en el conjunto elegido:
  - Posición fundamental (R en cuerda más grave del set).
  - Primera inversión (3ra en cuerda más grave del set).
  - Segunda inversión (5ta en cuerda más grave del set).
- Cada tríada coloreada por cualidad (verde=mayor, azul=menor, amarillo=disminuido).
- Las tríadas en cuerdas 1-2-3 típicamente no usan cejilla — un dedo por nota.

**Modo "ascensor"**:
- Para un acorde elegido (ej: Cmaj), mostrar las 3 inversiones distribuidas a lo largo del mástil — desde la inversión más grave hasta la más aguda (cerca de fret 17–22).
- Animar una "subida" desde la inversión más grave a la más aguda.
- Conexión con escala: opcionalmente superponer la escala completa en tono tenue.

**Modo conexión**:
- Tomar una progresión definida en Módulo 4 y mostrar su versión "tríada en cuerdas agudas".
- Demostrar voice leading óptimo (mano se mueve mínimamente entre acordes).
- Esta vista enseña a usar tríadas como inserción melódica durante un solo.

## 6. Requisitos visuales y UX

### 6.1. Mástil compartido entre módulos

Reusar `fbInitBoard` y extender para 22 trastes:

- 22 trastes visibles por defecto, marcadores en trastes 3, 5, 7, 9, 12 (doble), 15, 17, 19, 21.
- Zoom adaptativo: notas fuera de la posición activa con alpha 0.15-0.4.
- Modo zoom opcional (doble click sobre posición).
- Etiquetas de trastes cada 2-3 trastes en la parte inferior, énfasis en 12 y 24.
- Etiquetas de cuerdas (E A D G B E) a la izquierda.
- Sistema de colores: cualidad mayor = verde, menor = azul, disminuido = amarillo/naranja.
- Notas de la escala: tono tenue (alpha 0.3).
- Notas activas del acorde: tono fuerte (alpha 1.0).
- Raíz del acorde: dorado, anillo destacado.
- Cejilla (cuando aplica): barra horizontal semitransparente.
- **Cuerdas enmudecidas**: marcar visualmente con una "X" arriba de la cuerda en el mini-diagrama del voicing (no en el mástil principal — ahí simplemente no tienen notas activas).
- Etiquetas de intervalo (R, 3, 5, etc.) sobreimpuestas cuando aplique.

### 6.2. Tipografía y estética

Mantener consistencia con la estética actual del repo. Usar `Bebas Neue` o `DM Mono` para labels y `Lora` o similar para texto descriptivo.

### 6.3. Responsive

Funciona en pantallas desde 1024px. En pantallas más estrechas: scroll horizontal del mástil, o fallback a renderizado parcial (12-15 trastes) con botón "ver mástil completo".

## 7. Arquitectura técnica

### 7.1. Stack

- HTML + CSS + JavaScript vanilla (consistente con el repo).
- Sin frameworks pesados a menos que se justifique (discutir en `/improve-codebase-architecture`).
- Audio: Tone.js si se incluye.

### 7.2. Módulos de código

- `theory/intervals.js` — utilidades de intervalos y construcción de acordes.
- `theory/scales.js` — escalas y modos.
- `theory/diatonic.js` — acordes diatónicos por escala.
- `theory/voicings.js` — aplicación de templates, validación de las 3 reglas, validación de playability.
- `theory/templates.js` — catálogo de voicing templates predefinidos (sección 4.6).
- `fretboard/board.js` — renderizado del mástil de 22 trastes.
- `fretboard/positions.js` — cálculo de posiciones de escala.
- `fretboard/highlights.js` — sistema de capas.
- `audio/synth.js` — sintetizador (opcional).
- `audio/metronome.js` — metrónomo.
- `modules/chord-id.js` — Módulo 1.
- `modules/diatonic-lab.js` — Módulo 2.
- `modules/shape-lab.js` — Módulo 3.
- `modules/progression.js` — Módulo 4.
- `modules/triad-convergence.js` — Módulo 5.
- `state/store.js` — estado global.

### 7.3. Estructura de datos

**Nota**: 
```js
{ string: 6, fret: 5, note: 'A', octave: 2, midi: 45 }
```

**Acorde**:
```js
{
  root: 'A',
  quality: 'minor',  // 'major', 'minor', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'm7b5'
  notes: ['A', 'C', 'E'],
  intervals: ['R', 'b3', '5'],
}
```

**Voicing template** (definición abstracta):
```js
{
  id: 'e-shape-min',
  name: 'E-shape menor',
  rootString: 6,
  stringsUsed: [6, 5, 4, 3, 2, 1],
  mutedStrings: [],  // siempre las strings > rootString
  intervals: {
    6: { interval: 'R', fretOffset: 0 },
    5: { interval: '5', fretOffset: 2 },
    4: { interval: 'R', fretOffset: 2 },
    3: { interval: 'b3', fretOffset: 0 },
    2: { interval: '5', fretOffset: 0 },
    1: { interval: 'R', fretOffset: 0 },
  },
  appliesTo: ['minor'],
  hasBarre: true,
  barre: { fretOffset: 0, fromString: 6, toString: 1 },
}
```

**Voicing aplicado** (resultado de aplicar un template a una raíz):
```js
{
  templateId: 'e-shape-min',
  chord: { /* objeto Acorde */ },
  positions: [
    { string: 6, fret: 5, finger: 1, interval: 'R', isBarre: true },
    { string: 5, fret: 7, finger: 3, interval: '5' },
    { string: 4, fret: 7, finger: 4, interval: 'R' },
    { string: 3, fret: 5, finger: 1, interval: 'b3', isBarre: true },
    { string: 2, fret: 5, finger: 1, interval: '5', isBarre: true },
    { string: 1, fret: 5, finger: 1, interval: 'R', isBarre: true },
  ],
  mutedStrings: [],
  hasBarre: true,
  barre: { fret: 5, fromString: 6, toString: 1, finger: 1 },
  difficulty: 'medium',
  scalePosition: 5,
}
```

**Estado global**:
```js
{
  key: 'A',
  mode: 'minor',
  position: { type: 'standard', value: 5 },  // o { type: 'fret', value: 7 }
  octaveShift: 0,
  layers: { scale: true, diatonicRoots: true, triangles: true, activeVoicing: null },
  customTemplates: [/* templates personalizados */],
}
```

### 7.4. Lógica crítica

**Identificación de acordes** (Module 1):
- Para cada conjunto de notas seleccionadas, computar pitch classes.
- Para cada nota, asumirla como raíz, calcular intervalos, comparar con templates de acordes (mayor, menor, etc.).
- Default: ignorar qué nota es la más grave (modo no-inversión).
- Toggle "modo inversión": si activo, la nota más grave determina el bajo y se reportan slash chords.
- Comparar voicing seleccionado con catálogo de templates (sección 4.6) y reportar match si lo hay.

**Aplicación de templates** (Module 2):
- Para cada acorde diatónico en una posición, enumerar templates aplicables:
  - Template `t` aplica si: la raíz del acorde existe en la cuerda raíz del template dentro de la posición Y todas las notas del voicing resultante están dentro de la posición (o como mucho 2 trastes fuera).
- Devolver top 2-3 ranked.
- **No generar voicings exhaustivamente**. La extensibilidad pasa por agregar templates al catálogo, no por enumerar combinaciones.

**Validación de las 3 reglas**:
- Toda voicing devuelto debe satisfacer:
  - Raíz en cuerda más grave del voicing.
  - Solo cuerdas ≤ cuerda raíz están en uso.
  - Al menos una nota en cuerdas 1, 2 o 3.
- Si un template predefinido no cumple, es un bug del template — fallar con error claro.

**Voice leading** (Module 4):
- Notas comunes entre acordes: se mantienen.
- Notas que cambian: se animan.
- Calcular semitones de movimiento para visualizar dirección.

### 7.5. Persistencia (localStorage)

- Última tonalidad/posición.
- Estado de capas activas.
- Templates personalizados (Module 3).
- Progresiones guardadas.
- Preferencias UI.

### 7.6. Performance

- Renderizado <16ms.
- Con 22 trastes y 6 cuerdas son ~132 celdas — manejable en SVG.
- Templates aplicables se computan al cambiar posición/raíz, no constantemente.

## 8. Casos de uso para validación

Cada uno debe funcionar end-to-end como criterio de aceptación. Convertir en issues durante `/prd-to-issues`:

1. **Identificación básica**: Selecciono A, C, E. La herramienta dice "Am" como primera interpretación (modo no-inversión, default).
2. **Identificación con inversión**: Activo modo inversión. Selecciono E (cuerda 6 fret 0), G (cuerda 5 fret 10), C (cuerda 4 fret 10). La herramienta dice "C/E".
3. **Identificación con template match**: Selecciono las 6 notas de un E-shape barre Am. La herramienta dice "Am" Y reporta "matchea template `e-shape-min`".
4. **Identificación de tríada en zona aguda**: Selecciono A (cuerda 3 fret 14), C (cuerda 2 fret 13), E (cuerda 1 fret 12). La herramienta detecta Am en raíz, sin cejilla, matchea template `triad-321-root`.
5. **Diatonic Lab — escala mayor**: C mayor, posición 1, capas raíces y triángulos prendidas. Veo raíces de C, F, G como triángulo verde y D, E, A como azul, B amarillo aislado.
6. **Diatonic Lab — solo escala**: Apago capa raíces. Veo solo notas de C mayor en posición 1.
7. **Diatonic Lab — voicings de Am**: En Am posición 5, click en raíz A (cuerda 6 fret 5). Veo 2-3 voicings: E-shape barre primero (voicing completo), opcionalmente tríada en cuerdas 1-2-3 si la posición la alcanza. **No veo** triadas en cuerdas 4-5-6 ni voicings con la 3ra en bajo.
8. **Diatonic Lab — voicings de Cmaj con 7**: En C mayor posición elevada, click en C como acorde maj7. Veo 1-2 voicings: A-shape maj7 si aplica, drop-2 si la posición lo permite. Algunos con cejilla, otros sin.
9. **Shape Lab — guardar template propio**: En Module 1, identifico una tríada de Cm en cuerdas 1-2-3 (sin cejilla). Click "guardar como template". El sistema valida las 3 reglas, las cumple, y guarda. Voy a Shape Lab y la veo en mi biblioteca.
10. **Shape Lab — validación falla**: Intento crear un template con raíz en cuerda 4 y notas solo en cuerdas 4-5-6. El sistema rechaza porque no incluye cuerdas 1-3.
11. **Progresión simple**: Defino i-iv-v-i en Am, posición 5, BPM 80. Play. Veo los 4 acordes con voicings (todos respetando las 3 reglas), metrónomo marca, voice leading se anima.
12. **Triad convergence — solo cuerdas 1-2-3**: Elijo C mayor, conjunto cuerdas 1-2-3. Veo las 3 inversiones de C, F, G y las 3 de Am, Dm, Em distribuidas en el mástil. **No veo** tríadas en cuerdas 3-4-5 ni 4-5-6.

## 9. Decisiones explícitas para discutir en `/grill-me`

- **¿SVG o Canvas para el mástil?** Con 22 trastes, la decisión se vuelve más crítica.
- **¿Tone.js u otra opción de audio?**
- **¿SPA con tabs o multi-page?** El estado compartido (tonalidad, posición, capas) es más fácil con SPA.
- **¿Cómo manejar la posición arbitraria?** ¿4 trastes a partir del traste indicado, 5 trastes, adaptativo?
- **¿Cómo se renderiza la cejilla parcial?** Barra semitransparente o cambio de fondo de celda.
- **¿La transición animada entre posiciones (modo ascensor) cuesta más de lo que vale?**
- **¿Audio sintético: MVP o v2?**
- **¿Cuántos templates tener pre-definidos en MVP?** Mi propuesta: las 12 de la sección 4.6. ¿Incluir más, menos?
- **¿Qué pasa si ningún template aplica para un acorde en una posición?** ¿Mostrar mensaje "no hay voicings idiomáticos en esta posición, prueba otra"? ¿Generar un fallback exhaustivo con advertencia?
- **¿La regla 3 (alcance a zona aguda) admite excepciones?** ¿Power chords, dyads de R+5, voicings de R+3 sin 5ta? Decisión: NO en MVP. Solo voicings que toquen 1-2-3.

## 10. Fuera de alcance (explícito)

- Voicings con la raíz no en bajo (inversiones de bajo).
- Voicings restringidos a cuerdas 4-5-6 (rhythm voicings, power chords).
- Acordes con extensiones complejas (9, 11, 13, alteraciones).
- Acordes no diatónicos (préstamos modales, dominantes secundarios). v2.
- Reconocimiento de audio.
- Tablatura imprimible.
- DAW integration.
- Lecciones guiadas.
- Tracking, gamification, spaced repetition.
- Bajo, ukulele.
- Afinaciones alternativas en MVP.

## 11. Flujo de ejecución requerido

1. **`/write-a-prd`**: Convertir este documento en PRD formal del repo.

2. **`/grill-me`**: Identificar huecos. Especialmente presionar:
   - Decisiones de sección 9.
   - Si el catálogo de templates de sección 4.6 es completo o le faltan casos comunes.
   - Si la heurística de "qué template aplica en qué posición" es concreta y verificable.
   - Si el sistema de capas se implementa eficientemente.
   - Cómo integra con el repo existente sin duplicar código.

3. **`/prd-to-issues`**: Issues granulares en GitHub. Cada issue implementable por Sonnet en una sesión (~1–3 horas). Priorizar por dependencia: theory base, fretboard 22 trastes, catálogo de templates, módulo 1, módulo 2, etc.

4. **`/improve-codebase-architecture`**: Revisar arquitectura, decidir SPA vs multi-page, evitar duplicación con CAGED, refactorizar mástil para 22 trastes desde su núcleo.

5. **`/tdd`**: Plan de pruebas. Énfasis:
   - Tests unitarios para teoría (intervalos, acordes, escalas) — críticos.
   - Tests para validación de las 3 reglas en cada template predefinido.
   - Tests para aplicación de templates a raíces específicas.
   - Tests para identificación de acordes (con y sin modo inversión).
   - Tests para sistema de capas.
   - Tests visuales / e2e (Playwright si está en el repo).

## 12. Notas para Sonnet (futuro ejecutor)

- Este documento es el norte. Si algo no encaja con esta visión, parar y consultar.
- Reusar código existente del repo. Extender mástil a 22 trastes en lugar de crear uno nuevo.
- **Las 3 reglas de la sección 4.4 son inviolables.** Un voicing que no las cumple es un bug.
- **No enumerar voicings exhaustivamente.** Usar el catálogo de templates. Si querés más voicings, agregás más templates al catálogo.
- **Cejilla emergente**: nunca asumir que un voicing requiere cejilla. La cejilla es consecuencia de la digitación del template, no requisito.
- Probar cada módulo con guitarra real antes de cerrar issues. Los voicings deben sonar bien al tocarlos.

---

**Fin del documento v3.** Empezar con `/write-a-prd` referenciando esto como input principal.
