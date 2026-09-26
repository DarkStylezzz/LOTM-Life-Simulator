# Lord of the Mysteries — Life Simulator

Un simulador de vida en el mundo de *Lord of the Mysteries*. Nacés en una ciudad y una familia que no elegís, crecés, trabajás, te enamorás, perdés gente… y tal vez, algún día, notás que el mundo esconde algo. Lo que hagas con eso —investigar, callar, beber una poción, unirte a una Iglesia, vender un secreto, sentarte a una mesa sobre la niebla gris— es tu vida.

No hay puntaje. Al final hay una biografía.

## Cómo jugar

Abrí `index.html` en cualquier navegador moderno (funciona directo desde el disco, sin servidor ni instalación). La partida se guarda sola en el navegador; desde **Opciones** se puede exportar/importar como `.json`.

- **Dificultad:** *Fácil* (para vivir la historia: más pistas, heridas más leves, pociones más nobles y hasta tres segundas oportunidades cuando una muerte evitable llega), *Normal*, *Difícil* o *Pesadilla*. Se elige al nacer y se puede cambiar en cualquier momento desde **Opciones**.
- **Avanzar el tiempo:** un mes, hasta fin de la temporada, o *hasta que pase algo*. El tiempo se detiene solo ante cualquier decisión, combate, ritual, muerte o revelación.
- **Tiempo libre:** cada temporada tenés un poco (depende de tu edad, tu trabajo, tu familia). Investigar, actuar tu papel, explorar, colaborar con una organización o pasar tiempo con alguien lo consumen. No hay grind: no se puede hacer todo.
- **Teclado:** `1`–`6` cambian de sección (o eligen una opción si hay una escena abierta), `M` un mes, `T` fin de temporada, `I` hasta algo importante, `?` ayuda, `Esc` cierra ventanas.

## Qué hay en el juego

| Sistema | Resumen |
|---|---|
| Tiempo | Meses, temporadas y años; tiempo libre por temporada; resúmenes de temporada y de año. |
| Dificultad | Fácil, Normal, Difícil y Pesadilla: multiplicadores de riesgo, pistas, digestión, pociones, recompensas y daño en combate (`data/difficulty.js`). En Fácil, hasta tres muertes evitables no llegan: el personaje sobrevive con una secuela, y la biografía lo cuenta. |
| Eventos | Datos con `id, type, rarity, tags, requirements, weight, cooldown, repeatable, narrativeImportance, hiddenRequirements, choices, consequences, delayedConsequences`. Rarezas común / poco común / raro / místico / extraordinario. |
| Memoria y consecuencias | El personaje recuerda favores, traiciones, pactos, pérdidas. Hay verdades ocultas que se descubren tarde (o nunca: aparecen al final, en *Lo que nunca supo*). |
| Personas | NPCs con personalidad, objetivos, miedos, secretos, vida propia (se casan, se mudan, enferman, sospechan, te delatan) y siete ejes de relación. Familia que crece por etapas. |
| Vías | 14 vías. Descubrimiento en etapas con pistas reales, parciales y falsas; los hilos no tienen nombre hasta que se identifican. |
| Investigación | Siete métodos (biblioteca, iglesia, símbolos, documentos, interrogar, clandestino, místico), foco en un hilo, *atar cabos*, rumores que se enfrían. |
| Conocimiento | Hechos, secretos, saber prohibido y entidades; algunos se pagan con cordura. |
| Método de Actuación y digestión | Escenas por vía y Sequence; calidad de la actuación; digestión natural por vivir el papel (hasta en el trabajo). |
| Pociones y Advancement | Para subir de Sequence hace falta: la poción actual digerida, la fórmula de la próxima, sus dos ingredientes (el principal se puede reemplazar por una Característica), el dinero del ritual (del bolsillo o del banco) y cordura suficiente. Todo está a la vista en **Misticismo → Tu camino**, con cómo se consigue cada cosa. **Buscar lo que te falta** (una vez por temporada) empuja siempre hacia el próximo paso: ponerle nombre a una vía, entenderla, la fórmula o un ingrediente. La poción se prepara dentro del ritual, que tiene cuatro pasos y un presentimiento antes de empezar; la primera se prepara y se bebe en la misma noche. Si el ritual falla, la fórmula queda. Lo que frena es la altura: de la Sequence 5 para arriba la poción tarda años en digerirse, las fórmulas y los ingredientes casi no circulan (las organizaciones sólo se los confían a quien tiene su confianza y el mercado negro no pasa de la Sequence 5) y ningún ritual de semidiós es seguro. |
| Sequence 0 | Una cadena de acontecimientos extraordinarios, un ascenso que puede fallar y un modo divino que cambia la interfaz. |
| Combate | Táctico: distancia, entorno, estados, arquetipos de enemigos, información oculta de la Sequence rival (??? → rango → estimación → exacta), la Sequence pesa (un rival más débil pega menos y es más fácil dejarlo atrás, y cada huida fallida acerca la siguiente), heridas que quedan, huir o hablar como opciones reales. |
| Facciones | Iglesias, Nighthawks, MI9, la Orden de la Aurora, la Mente Colmena, los Alquimistas de la Psicología… acceso, mérito, pedidos, deberes, sospecha, persecución, traición. |
| Tarot Club | Rumores → pruebas que no sabés que son pruebas → invitación → reuniones. |
| Mundo | Nueve ciudades vivas —Backlund, Tingen, Bayam, Pritz Harbor, un pueblo sin nombre, Trier (Intis), Constant, Enmat Harbor y Balam Oriental—, cada una con su economía, sus facciones, sus oficios, sus lugares para explorar, sus rumores, sus eventos y (en Trier) sus nombres. Historia del mundo libre, canon o alternativa, y la atención del mundo oculto. |
| La segunda mitad de la vida | Padres que cuidar, hijos en problemas, amigos que se mueren primero, traslados, inversiones, testamento, nietos, confesiones… y, para los Beyonders, no envejecer al ritmo de los demás. De la Sequence 6 hacia arriba: la convergencia, los que te estudian, alguien que te reza, el tiempo que pasa distinto, algo más grande que te mira. |
| Economía e inventario | Sueldo, gastos, banco, deuda con cuotas, vivienda, propiedades, inflación. Inventario por categorías con procedencia, usos y riesgos. |
| Artefactos sellados | Veinte objetos con grado, efectos, contras, activación, comportamiento oculto, origen y a veces dueño anterior o ciudad de origen. |
| Anclas | Ocultas hasta la Sequence 5; sostienen la cordura y la humanidad. |
| Finales | Biografía por etapas que analiza toda la vida. Sin puntaje. |

En números: 258 eventos, 36 encargos, 23 enemigos, 20 artefactos, 23 rumores, 12 lugares para explorar, 36 oficios y 48 saberes.

La información sensible se muestra según lo que el personaje sabe: dato **objetivo** (●), **estimado** (◐) o **desconocido** (○). *Mostrar números exactos* está en Opciones.

## Estructura del código

JavaScript vanilla con `<script>` clásicos (no módulos ES, para que funcione abriendo el archivo sin servidor). El orden de carga está en `index.html`.

```
index.html      estructura y orden de carga
styles.css      estilos
main.js         arranque
data/           contenido (vías, eventos, NPCs, facciones, objetos, enemigos, conocimiento...)
data/events/    eventos por tema (infancia, vida, místicos, sociales, familia, decisiones, Tarot, Sequence 0,
                ciudades, la segunda mitad de la vida y las Sequences altas)
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
node tests/scenarios.js      # 24 escenarios dirigidos: el ascenso, Tarot Club, Sequence 0, finales, migración v7, modo fácil, ciudades, artefactos...
node tests/simulate.js 40    # 40 vidas completas con un "jugador" automático: errores, bloqueos, estado serializable y balance
node tests/simulate.js 10 --ui   # lo mismo, dibujando todas las pestañas con un DOM simulado
node tests/simulate.js 40 --diff=easy --style=dedicado --funnel
                             # balance: dificultad fija, estilo de jugador (mixto, dedicado o tranquilo)
                             # y el "embudo" del camino místico (a qué edad se llega a cada paso, cuántos
                             # rituales se intentan y cuántos salen bien, y en qué Sequence se muere peleando)
node tests/fuzz.js 3         # fuerza cada evento y cada opción, cada misión, acción de NPC, evento del mundo y rumor,
                             # en nueve estados de vida, y avisa qué eventos no pudo disparar nunca
node tests/ui-smoke.js       # navegador real (Playwright): escritorio, móvil y una partida v7 migrada
```

## Partidas guardadas

`SAVE_VERSION = 8`. Las partidas de versiones anteriores (v6 y v7) se migran solas al cargarlas (`migrateSave` en `systems/save.js`): se conservan personaje, memoria, diario, hitos, NPCs, dinero, vía, Sequence, conocimiento (convertido en pistas), ingredientes, libros y artefactos. Una decisión o un encargo que haya quedado abierto se reabre si esa misma escena existe en esta versión; sólo se pierden las prácticas de actuación y los rituales a medio hacer (cambiaron por completo), con una nota en el diario. Un combate en curso se retoma si el enemigo existe en la versión nueva.

Las partidas v8 ya empezadas reciben solas el contenido nuevo (ciudades, eventos, encargos, artefactos) y se reparan al cargar: si quedaron atrapadas en la "guerra corta" del mundo libre, que antes no terminaba nunca, la paz queda agendada. Con el ascenso simplificado, una poción que ya estaba preparada cuenta como requisito cumplido, una preparación a medio hacer se termina como antes y un ritual de Advancement que haya quedado abierto con la versión anterior (de cinco pasos) se cierra solo al retomarlo.
