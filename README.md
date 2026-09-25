# Lord of the Mysteries — Life Simulator

Un simulador de vida en el mundo de *Lord of the Mysteries*. Nacés en una ciudad y una familia que no elegís, crecés, trabajás, te enamorás, perdés gente… y tal vez, algún día, notás que el mundo esconde algo. Lo que hagas con eso —investigar, callar, beber una poción, unirte a una Iglesia, vender un secreto, sentarte a una mesa sobre la niebla gris— es tu vida.

No hay puntaje. Al final hay una biografía.

## Cómo jugar

Abrí `index.html` en cualquier navegador moderno (funciona directo desde el disco, sin servidor ni instalación). La partida se guarda sola en el navegador; desde **Opciones** se puede exportar/importar como `.json`.

- **Avanzar el tiempo:** un mes, hasta fin de la temporada, o *hasta que pase algo*. El tiempo se detiene solo ante cualquier decisión, combate, ritual, muerte o revelación.
- **Tiempo libre:** cada temporada tenés un poco (depende de tu edad, tu trabajo, tu familia). Investigar, actuar tu papel, explorar, colaborar con una organización o pasar tiempo con alguien lo consumen. No hay grind: no se puede hacer todo.
- **Teclado:** `1`–`6` cambian de sección (o eligen una opción si hay una escena abierta), `M` un mes, `T` fin de temporada, `I` hasta algo importante, `?` ayuda, `Esc` cierra ventanas.

## Qué hay en el juego

| Sistema | Resumen |
|---|---|
| Tiempo | Meses, temporadas y años; tiempo libre por temporada; resúmenes de temporada y de año. |
| Eventos | Datos con `id, type, rarity, tags, requirements, weight, cooldown, repeatable, narrativeImportance, hiddenRequirements, choices, consequences, delayedConsequences`. Rarezas común / poco común / raro / místico / extraordinario. |
| Memoria y consecuencias | El personaje recuerda favores, traiciones, pactos, pérdidas. Hay verdades ocultas que se descubren tarde (o nunca: aparecen al final, en *Lo que nunca supo*). |
| Personas | NPCs con personalidad, objetivos, miedos, secretos, vida propia (se casan, se mudan, enferman, sospechan, te delatan) y siete ejes de relación. Familia que crece por etapas. |
| Vías | 14 vías. Descubrimiento en etapas con pistas reales, parciales y falsas; los hilos no tienen nombre hasta que se identifican. |
| Investigación | Siete métodos (biblioteca, iglesia, símbolos, documentos, interrogar, clandestino, místico), foco en un hilo, *atar cabos*, rumores que se enfrían. |
| Conocimiento | Hechos, secretos, saber prohibido y entidades; algunos se pagan con cordura. |
| Método de Actuación y digestión | Escenas por vía y Sequence; calidad de la actuación; digestión natural por vivir el papel (hasta en el trabajo). |
| Pociones y Advancement | Fórmulas (verdaderas, incompletas o falsas), ingredientes con pureza, Características, preparación en pasos, ritual de cinco pasos con presentimiento. |
| Sequence 0 | Una cadena de acontecimientos extraordinarios, un ascenso que puede fallar y un modo divino que cambia la interfaz. |
| Combate | Táctico: distancia, entorno, estados, arquetipos de enemigos, información oculta de la Sequence rival (??? → rango → estimación → exacta), heridas que quedan, huir o hablar como opciones reales. |
| Facciones | Iglesias, Nighthawks, MI9, la Orden de la Aurora, la Mente Colmena, los Alquimistas de la Psicología… acceso, mérito, pedidos, deberes, sospecha, persecución, traición. |
| Tarot Club | Rumores → pruebas que no sabés que son pruebas → invitación → reuniones. |
| Mundo | Ciudades vivas, historia del mundo (libre, canon o línea alternativa que se puede torcer), atención del mundo oculto. |
| Economía e inventario | Sueldo, gastos, banco, deuda con cuotas, vivienda, propiedades, inflación. Inventario por categorías con procedencia, usos y riesgos. |
| Artefactos sellados | Grado, efectos, contras, activación, comportamiento oculto, origen, dueño anterior. |
| Anclas | Ocultas hasta la Sequence 5; sostienen la cordura y la humanidad. |
| Finales | Biografía por etapas que analiza toda la vida. Sin puntaje. |

La información sensible se muestra según lo que el personaje sabe: dato **objetivo** (●), **estimado** (◐) o **desconocido** (○). *Mostrar números exactos* está en Opciones.

## Estructura del código

JavaScript vanilla con `<script>` clásicos (no módulos ES, para que funcione abriendo el archivo sin servidor). El orden de carga está en `index.html`.

```
index.html      estructura y orden de carga
styles.css      estilos
main.js         arranque
data/           contenido (vías, eventos, NPCs, facciones, objetos, enemigos, conocimiento...)
data/events/    eventos por tema (infancia, vida, místicos, sociales, familia, decisiones, Tarot, Sequence 0)
systems/        reglas del juego (estado, efectos, tiempo, eventos, NPCs, vías, combate, guardado...)
ui/             interfaz (una pieza por sección)
tests/          pruebas sin navegador y en navegador
```

`STATE` sólo guarda datos (nunca funciones): las escenas pendientes se guardan como `{defId, ctx}` y se resuelven buscando la definición, así una decisión sobrevive a guardar y recargar.

### Agregar contenido

- **Un evento:** sumalo a cualquier arreglo de `data/events/*.js` con su `id`. El motor lo toma solo.
- **Una vía nueva:** `registerPathway('clave', {name, theme, sequences, vague, rituals, ingredients, formulas, abilities, actingRoles, actingScenes})` (ver `systems/pathway.js`). Aparece en partidas nuevas y en curso.
- **Efectos:** las consecuencias se escriben como datos (`{sanity:[-6,-2], clue:{...}, rel:{npc:'$ctx', trust:5}, schedule:{inMonths:[12,36], ...}}`, ver `systems/effects.js`).

## Pruebas

Requieren Node 18+ (y Playwright para la de navegador).

```
node tests/scenarios.js      # 16 escenarios dirigidos: Tarot Club, Sequence 0, finales, migración v7, cada habilidad y escena de actuación...
node tests/simulate.js 40    # 40 vidas completas con un "jugador" automático: errores, bloqueos, estado serializable y balance
node tests/simulate.js 10 --ui   # lo mismo, dibujando todas las pestañas con un DOM simulado
node tests/ui-smoke.js       # navegador real (Playwright): escritorio, móvil y una partida v7 migrada
```

## Partidas guardadas

`SAVE_VERSION = 8`. Las partidas de versiones anteriores (v6 y v7) se migran solas al cargarlas (`migrateSave` en `systems/save.js`): se conservan personaje, memoria, diario, hitos, NPCs, dinero, vía, Sequence, conocimiento (convertido en pistas), ingredientes, libros y artefactos. Lo único que no se puede recuperar es una decisión que haya quedado abierta en la versión anterior (sus opciones no se guardaban), y un combate en curso sólo se retoma si el enemigo existe en la versión nueva.
