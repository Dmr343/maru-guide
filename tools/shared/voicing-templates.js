// Catálogo estático de voicing templates predefinidos. IIFE, file:// safe.
// Expone GuitarShared.voicingTemplates.
//
// Convenciones:
//   - string: 6=low E, 1=high e (numeración estándar de guitarra)
//   - fretOffset: relativo al fret de la raíz (puede ser negativo)
//   - OPEN_NOTES (si=0..5): ['E','A','D','G','B','E'] donde si=0→low E (string 6)
//     siToString(si) = 6 - si  ←→  stringToSi(s) = 6 - s
//
// Todos los templates han sido calculados algebráicamente y deben verificarse
// con guitarra real antes de cerrar el issue de voicing-engine.
(function (G) {

  const TEMPLATES = [

    // ─── E-SHAPE (rootString=6) ───────────────────────────────────────────────
    // Derivados del acorde abierto E. Cejilla en fretOffset 0.
    // Fret de referencia: cuerda 6 (low E, open=E=4).
    // string 5 (A, open=A=9):  offset para 5ª  = E+X+7  → A+off → off=+2
    // string 4 (D, open=D=2):  offset para R   = E+X    → D+off → off=+2
    // string 3 (G, open=G=7):  offset para 3ª  = E+X+4  → G+off → off=-3+...
    //   Calculus: (4+X+4)%12 = (G+off)%12 → off=(8+X-7-X)=+1  (mayor)
    //             (4+X+3)%12 = (G+off)%12 → off=(7+X-7-X)= 0  (menor = barre)
    // string 2 (B, open=B=11): offset para 5ª  = (4+X+7)%12=(B+off)%12 → off=0  (barre)
    // string 1 (E, open=E=4):  offset para R   = (4+X)%12=(E+off)%12   → off=0  (barre)

    {
      id: 'e-shape-maj', name: 'E-shape Mayor',
      rootString: 6, stringsUsed: [6,5,4,3,2,1], mutedStrings: [],
      intervals: {
        6: { interval: 'R',  fretOffset: 0 },
        5: { interval: '5',  fretOffset: 2 },
        4: { interval: 'R',  fretOffset: 2 },
        3: { interval: '3',  fretOffset: 1 },
        2: { interval: '5',  fretOffset: 0 },
        1: { interval: 'R',  fretOffset: 0 },
      },
      appliesTo: ['major'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 6, toString: 1 },
    },

    {
      id: 'e-shape-min', name: 'E-shape Menor',
      rootString: 6, stringsUsed: [6,5,4,3,2,1], mutedStrings: [],
      intervals: {
        6: { interval: 'R',  fretOffset: 0 },
        5: { interval: '5',  fretOffset: 2 },
        4: { interval: 'R',  fretOffset: 2 },
        3: { interval: 'b3', fretOffset: 0 },
        2: { interval: '5',  fretOffset: 0 },
        1: { interval: 'R',  fretOffset: 0 },
      },
      appliesTo: ['minor'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 6, toString: 1 },
    },

    // E7 open=020100: str5+2=B(5ª), str4+0=D(b7 cuando root=E), str3+1=G#(3ª), str2+0=B(5ª)
    // Para root en str6 barrado: str4 queda en barre (b7), str5 en +2 (5ª)
    {
      id: 'e-shape-7', name: 'E-shape 7',
      rootString: 6, stringsUsed: [6,5,4,3,2,1], mutedStrings: [],
      intervals: {
        6: { interval: 'R',  fretOffset: 0 },
        5: { interval: '5',  fretOffset: 2 },
        4: { interval: 'b7', fretOffset: 0 },
        3: { interval: '3',  fretOffset: 1 },
        2: { interval: '5',  fretOffset: 0 },
        1: { interval: 'R',  fretOffset: 0 },
      },
      appliesTo: ['dom7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 6, toString: 1 },
    },

    // Em7 open=022000: str5+2=B(5ª), str4+2=E(R), str3+0=G(b3→wait)
    // Em7=020000: str5+2=B, str4+0=D(b7 of E), str3+0=G(b3), str2+0=B(5ª), str1+0=E(R)
    {
      id: 'e-shape-m7', name: 'E-shape m7',
      rootString: 6, stringsUsed: [6,5,4,3,2,1], mutedStrings: [],
      intervals: {
        6: { interval: 'R',  fretOffset: 0 },
        5: { interval: '5',  fretOffset: 2 },
        4: { interval: 'b7', fretOffset: 0 },
        3: { interval: 'b3', fretOffset: 0 },
        2: { interval: '5',  fretOffset: 0 },
        1: { interval: 'R',  fretOffset: 0 },
      },
      appliesTo: ['min7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 6, toString: 1 },
    },

    // Emaj7 open=021100: str5+2=B(5ª), str4+1=D#(maj7), str3+1=G#(3ª), str2+0=B(5ª), str1+0=E(R)
    {
      id: 'e-shape-maj7', name: 'E-shape maj7',
      rootString: 6, stringsUsed: [6,5,4,3,2,1], mutedStrings: [],
      intervals: {
        6: { interval: 'R',  fretOffset: 0 },
        5: { interval: '5',  fretOffset: 2 },
        4: { interval: '7',  fretOffset: 1 },
        3: { interval: '3',  fretOffset: 1 },
        2: { interval: '5',  fretOffset: 0 },
        1: { interval: 'R',  fretOffset: 0 },
      },
      appliesTo: ['maj7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 1, toString: 2 },
    },

    // ─── A-SHAPE (rootString=5) ───────────────────────────────────────────────
    // Derivados del acorde abierto A. Root en str5 (A string, open=A=9).
    // str4 (D=2): 5ª offset+2  → (2+X+2)%12=(9+X+7)%12 ✓
    // str3 (G=7): R  offset+2  → (7+X+2)%12=(9+X)%12   ✓  (octava de raíz)
    // str2 (B=11): 3ª offset+2 → (11+X+2)%12=(9+X+4)%12 → maj
    //              b3 offset+1 → (11+X+1)%12=(9+X+3)%12 → min
    // str1 (E=4): 5ª offset+0  → (4+X)%12=(9+X+7)%12=16+X=4+X ✓

    {
      id: 'a-shape-maj', name: 'A-shape Mayor',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: '5',  fretOffset: 2 },
        3: { interval: 'R',  fretOffset: 2 },
        2: { interval: '3',  fretOffset: 2 },
        1: { interval: '5',  fretOffset: 0 },
      },
      appliesTo: ['major'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 5, toString: 1 },
    },

    {
      id: 'a-shape-min', name: 'A-shape Menor',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: '5',  fretOffset: 2 },
        3: { interval: 'R',  fretOffset: 2 },
        2: { interval: 'b3', fretOffset: 1 },
        1: { interval: '5',  fretOffset: 0 },
      },
      appliesTo: ['minor'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 5, toString: 1 },
    },

    // A7 open=x02020: str4+2=E(5ª), str3+0=G(b7 de A), str2+2=C#(3ª), str1+0=E(5ª)
    {
      id: 'a-shape-7', name: 'A-shape 7',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: '5',  fretOffset: 2 },
        3: { interval: 'b7', fretOffset: 0 },
        2: { interval: '3',  fretOffset: 2 },
        1: { interval: '5',  fretOffset: 0 },
      },
      appliesTo: ['dom7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 5, toString: 1 },
    },

    // Am7 open=x02010: str4+2=E(5ª), str3+0=G(b7), str2+1=C(b3), str1+0=E(5ª)
    {
      id: 'a-shape-m7', name: 'A-shape m7',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: '5',  fretOffset: 2 },
        3: { interval: 'b7', fretOffset: 0 },
        2: { interval: 'b3', fretOffset: 1 },
        1: { interval: '5',  fretOffset: 0 },
      },
      appliesTo: ['min7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 5, toString: 1 },
    },

    // Amaj7 open=x02120: str4+2=E(5ª), str3+1=G#(maj7), str2+2=C#(3ª), str1+0=E(5ª)
    {
      id: 'a-shape-maj7', name: 'A-shape maj7',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: '5',  fretOffset: 2 },
        3: { interval: '7',  fretOffset: 1 },
        2: { interval: '3',  fretOffset: 2 },
        1: { interval: '5',  fretOffset: 0 },
      },
      appliesTo: ['maj7'],
      hasBarre: true, barre: { fretOffset: 0, fromString: 5, toString: 1 },
    },

    // A-shape Disminuida: R en str5, b5 en str4, R en str3, b3 en str2, str1 muda.
    // str4 b5: (2+X+1)%12=(9+X+6)%12=(15+X)%12=(3+X)%12 ✓ (offset+1)
    // str3 R:  (7+X+2)%12=(9+X)%12 ✓ (offset+2, octava raíz)
    // str2 b3: (11+X+1)%12=(12+X)%12=(0+X)%12=(9+X+3)%12 ✓ (offset+1)
    {
      id: 'a-shape-dim', name: 'A-shape Disminuida',
      rootString: 5, stringsUsed: [5,4,3,2], mutedStrings: [6,1],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: 'b5', fretOffset: 1 },
        3: { interval: 'R',  fretOffset: 2 },
        2: { interval: 'b3', fretOffset: 1 },
      },
      appliesTo: ['dim'],
      hasBarre: false, barre: null,
    },

    // A-shape m7b5: igual que dim pero añade b7 en str1.
    // str1 b7: (4+X+3)%12=(9+X+10)%12=(7+X)%12 → (4+off)%12=(7+X)%12 → off=+3
    {
      id: 'a-shape-m7b5', name: 'A-shape m7b5',
      rootString: 5, stringsUsed: [5,4,3,2,1], mutedStrings: [6],
      intervals: {
        5: { interval: 'R',  fretOffset: 0 },
        4: { interval: 'b5', fretOffset: 1 },
        3: { interval: 'R',  fretOffset: 2 },
        2: { interval: 'b3', fretOffset: 1 },
        1: { interval: 'b7', fretOffset: 3 },
      },
      appliesTo: ['m7b5'],
      hasBarre: false, barre: null,
    },

    // ─── D-SHAPE (rootString=4) ───────────────────────────────────────────────
    // Derivados del acorde abierto D. Root en str4 (D string, open=D=2).
    // D major open=xx0232:
    //   str3(G=7)+2=A(5ª), str2(B=11)+3=D(R octava), str1(E=4)+2=F#(3ª)
    // D minor open=xx0231:
    //   str3+2=A(5ª), str2+3=D(R octava), str1+1=F(b3)

    {
      id: 'd-shape-maj', name: 'D-shape Mayor',
      rootString: 4, stringsUsed: [4,3,2,1], mutedStrings: [6,5],
      intervals: {
        4: { interval: 'R',  fretOffset: 0 },
        3: { interval: '5',  fretOffset: 2 },
        2: { interval: 'R',  fretOffset: 3 },
        1: { interval: '3',  fretOffset: 2 },
      },
      appliesTo: ['major'],
      hasBarre: false, barre: null,
    },

    {
      id: 'd-shape-min', name: 'D-shape Menor',
      rootString: 4, stringsUsed: [4,3,2,1], mutedStrings: [6,5],
      intervals: {
        4: { interval: 'R',  fretOffset: 0 },
        3: { interval: '5',  fretOffset: 2 },
        2: { interval: 'R',  fretOffset: 3 },
        1: { interval: 'b3', fretOffset: 1 },
      },
      appliesTo: ['minor'],
      hasBarre: false, barre: null,
    },

    // ─── TRÍADAS str 3-2-1 (rootString=3) ────────────────────────────────────
    // Root en str3 (G string, open=G=7). Cuerdas 3-2-1.
    // str2 (B=11): mayor +0 da 3ª: (11+R+0)%12=(7+R+4)%12 ✓
    //              menor -1 da b3: (11+R-1)%12=(10+R)%12=(7+R+3)%12 ✓
    // str1 (E=4):  5ª  -2: (4+R-2)%12=(2+R)%12=(7+R+7)%12=(14+R)%12=(2+R)%12 ✓

    {
      id: 'triad-321-maj', name: 'Tríada Mayor str 3-2-1',
      rootString: 3, stringsUsed: [3,2,1], mutedStrings: [6,5,4],
      intervals: {
        3: { interval: 'R', fretOffset:  0 },
        2: { interval: '3', fretOffset:  0 },
        1: { interval: '5', fretOffset: -2 },
      },
      appliesTo: ['major'],
      hasBarre: false, barre: null,
    },

    {
      id: 'triad-321-min', name: 'Tríada Menor str 3-2-1',
      rootString: 3, stringsUsed: [3,2,1], mutedStrings: [6,5,4],
      intervals: {
        3: { interval: 'R',  fretOffset:  0 },
        2: { interval: 'b3', fretOffset: -1 },
        1: { interval: '5',  fretOffset: -2 },
      },
      appliesTo: ['minor'],
      hasBarre: false, barre: null,
    },

    // Tríada Disminuida str 3-2-1
    // str2 b3: offset -1 (igual que menor) ✓
    // str1 b5: (4+R-3)%12=(1+R)%12=(7+R+6)%12=(13+R)%12=(1+R)%12 ✓
    {
      id: 'dim-triad-321', name: 'Tríada Disminuida str 3-2-1',
      rootString: 3, stringsUsed: [3,2,1], mutedStrings: [6,5,4],
      intervals: {
        3: { interval: 'R',  fretOffset:  0 },
        2: { interval: 'b3', fretOffset: -1 },
        1: { interval: 'b5', fretOffset: -3 },
      },
      appliesTo: ['dim'],
      hasBarre: false, barre: null,
    },

    // ─── TRÍADAS str 4-3-2 (rootString=4) ────────────────────────────────────
    // Root en str4 (D=2). Cuerdas 4-3-2.
    // str3 (G=7): mayor 3ª: (7+R-1)%12=(6+R)%12=(2+R+4)%12 ✓ offset -1
    //             menor b3: (7+R-2)%12=(5+R)%12=(2+R+3)%12 ✓ offset -2
    // str2 (B=11): 5ª: (11+R-2)%12=(9+R)%12=(2+R+7)%12 ✓ offset -2

    {
      id: 'triad-432-maj', name: 'Tríada Mayor str 4-3-2',
      rootString: 4, stringsUsed: [4,3,2], mutedStrings: [6,5,1],
      intervals: {
        4: { interval: 'R', fretOffset:  0 },
        3: { interval: '3', fretOffset: -1 },
        2: { interval: '5', fretOffset: -2 },
      },
      appliesTo: ['major'],
      hasBarre: false, barre: null,
    },

    {
      id: 'triad-432-min', name: 'Tríada Menor str 4-3-2',
      rootString: 4, stringsUsed: [4,3,2], mutedStrings: [6,5,1],
      intervals: {
        4: { interval: 'R',  fretOffset:  0 },
        3: { interval: 'b3', fretOffset: -2 },
        2: { interval: '5',  fretOffset: -2 },
      },
      appliesTo: ['minor'],
      hasBarre: false, barre: null,
    },

    // Tríada Disminuida str 4-3-2
    // str3 b3: offset -2 (igual que menor) ✓
    // str2 b5: (11+R-3)%12=(8+R)%12=(2+R+6)%12 ✓ offset -3
    {
      id: 'dim-triad-432', name: 'Tríada Disminuida str 4-3-2',
      rootString: 4, stringsUsed: [4,3,2], mutedStrings: [6,5,1],
      intervals: {
        4: { interval: 'R',  fretOffset:  0 },
        3: { interval: 'b3', fretOffset: -2 },
        2: { interval: 'b5', fretOffset: -3 },
      },
      appliesTo: ['dim'],
      hasBarre: false, barre: null,
    },

    // ─── SPREAD 4-STRING str 4-3-2-1 (rootString=4) ─────────────────────────
    // Voicings de 4 cuerdas con raíz en str4. Sin cejilla.
    // Verificados para Am7: A(str4,7), E(str3,9), G(str2,8), C(str1,8)
    //   str3 5ª: (7+R+2)%12=(2+R+7)%12 ✓ offset +2
    //   str2 b7: (11+R+1)%12=(12+R)%12=(2+R+10)%12 ✓ offset +1
    //   str1 b3: (4+R+1)%12=(5+R)%12=(2+R+3)%12 ✓ offset +1
    {
      id: 'spread-1234-m7', name: 'Spread str 4-3-2-1 m7',
      rootString: 4, stringsUsed: [4,3,2,1], mutedStrings: [6,5],
      intervals: {
        4: { interval: 'R',  fretOffset: 0 },
        3: { interval: '5',  fretOffset: 2 },
        2: { interval: 'b7', fretOffset: 1 },
        1: { interval: 'b3', fretOffset: 1 },
      },
      appliesTo: ['min7'],
      hasBarre: false, barre: null,
    },

    // Para dom7: str3=5ª(+2), str2=b7(+1), str1=3ª
    //   str1 3ª: (4+R+1)%12 debería dar 3ª=(2+R+4)%12=(6+R)%12 ✓ sólo si 5%12=6%12 — NO
    //   Mejor: str1 b7 en otro offset: b7=(2+R+10)%12=(12+R)%12=(0+R)%12
    //   (4+off)%12=(0+R)%12=(R)%12  → 4+off=R → depende del root. No es fijo.
    //   Usando str3=3ª(+1), str2=b7(+1), str1=5ª:
    //   str3 3ª: (7+R+1)%12=(8+R)%12 vs (2+R+4)%12=(6+R)%12 → 8≠6. No.
    //   str3 3ª offset -1: (7+R-1)%12=(6+R)%12=(2+R+4)%12 ✓
    //   str2 b7 offset +1: (11+R+1)%12=(0+R)%12=(2+R+10)%12 ✓
    //   str1 5ª offset -2: (4+R-2)%12=(2+R)%12=(2+R+... wait (2+R+7)%12=(9+R)%12 ≠ (2+R)%12.
    //   Recalculo str1 5ª: 5ª de root(=2+R)=(2+R+7)%12=(9+R)%12
    //   E string+off=(4+R+off)%12=(9+R)%12 → off=5
    //   Eso es offset +5, difícil pero posible (pinky estiramiento).
    //   Alternativa: str1 R (offset 0 no sirve, R octava): (4+R)%12=(2+R+?)%12 → no es chord tone.
    //   Mejor dejar spread-1234-dom7 con: R,3,b7,5 con offsets ajustados:
    //   str4=R(0), str3=3(-1), str2=b7(+1), str1=5(+5) — verificar con guitarra.
    {
      id: 'spread-1234-dom7', name: 'Spread str 4-3-2-1 dom7',
      rootString: 4, stringsUsed: [4,3,2,1], mutedStrings: [6,5],
      intervals: {
        4: { interval: 'R',  fretOffset:  0 },
        3: { interval: '3',  fretOffset: -1 },
        2: { interval: 'b7', fretOffset:  1 },
        1: { interval: '5',  fretOffset:  5 },
      },
      appliesTo: ['dom7'],
      hasBarre: false, barre: null,
    },

    // maj7: str4=R, str3=5ª(+2), str2=7(+2), str1=3ª
    //   str2 7: (11+R+2)%12=(13+R)%12=(1+R)%12 vs (2+R+11)%12=(13+R)%12=(1+R)%12 ✓ offset+2
    //   str1 3ª: (4+R+?)%12=(2+R+4)%12=(6+R)%12 → 4+off=6+R-... depends on R. ¿?
    //   off: (4+off)%12=(6+R)%12 — depende de R. No es offset fijo para 3ª en str1.
    //   Usamos str3=7(+2), str2=3(+2), str1=5(+5):
    //   str3 7: (7+R+2)%12=(9+R)%12 vs (2+R+11)%12=(13+R)%12=(1+R)%12 → 9≠1 ✗
    //   str3 3ª offset -1: =(6+R)%12=(2+R+4)%12 ✓ (verificado arriba para dom7)
    //   str2 7 offset +2: (11+R+2)%12=(1+R)%12=(2+R+11)%12 ✓
    //   str1 5 offset +5: =(9+R)%12=(2+R+7)%12 ✓
    {
      id: 'spread-1234-maj7', name: 'Spread str 4-3-2-1 maj7',
      rootString: 4, stringsUsed: [4,3,2,1], mutedStrings: [6,5],
      intervals: {
        4: { interval: 'R', fretOffset:  0 },
        3: { interval: '3', fretOffset: -1 },
        2: { interval: '7', fretOffset:  2 },
        1: { interval: '5', fretOffset:  5 },
      },
      appliesTo: ['maj7'],
      hasBarre: false, barre: null,
    },

  ];

  function getTemplatesForQuality(quality) {
    return TEMPLATES.filter(t => t.appliesTo.includes(quality));
  }

  G.voicingTemplates = { TEMPLATES, getTemplatesForQuality };

})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
