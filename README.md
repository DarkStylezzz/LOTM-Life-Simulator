# Lord of the Mysteries — Life Simulator

Un simulador de vida en el mundo de *Lord of the Mysteries*. Nacés en una ciudad y una familia que no elegís, crecés, trabajás, te enamorás, perdés gente… y tal vez, algún día, notás que el mundo esconde algo. Lo que hagas con eso —investigar, callar, beber una poción, unirte a una Iglesia, vender un secreto, sentarte a una mesa sobre la niebla gris— es tu vida.

No hay puntaje. Al final hay una biografía.

## Cómo jugar

Abrí `index.html` en cualquier navegador moderno (funciona directo desde el disco, sin servidor ni instalación). La partida se guarda sola en el navegador; desde **Opciones** se puede exportar/importar como `.json`.

- **Dificultad:** *Fácil* (para vivir la historia: más pistas, heridas más leves, pociones más nobles y hasta tres segundas oportunidades cuando una muerte evitable llega), *Normal*, *Difícil* o *Pesadilla*. Se elige al nacer y se puede cambiar en cualquier momento desde **Opciones**.
- **Avanzar el tiempo:** un mes, hasta fin de la temporada, o *hasta que pase algo*. El tiempo se detiene solo ante cualquier decisión, combate, ritual, muerte o revelación.
- **Linaje:** cuando una vida termina, la historia puede seguir con un hijo, una hija o alguien a quien le enseñaste tu vía. Desde los 60 años también podés cerrar tu vida cuando quieras (**Personas → Tu linaje → Cerrar esta vida**).
- **Lo que dejás:** desde la Sequence 6 podés fundar tu propia sociedad secreta, orden o culto (**Mundo → Fundar**), y desde la Sequence 7, tomar discípulos entre la gente que confía en vos (desde su ficha, en **Personas**).
- **Tiempo libre:** cada temporada tenés un poco (depende de tu edad, tu trabajo, tu familia). Investigar, actuar tu papel, explorar, colaborar con una organización o pasar tiempo con alguien lo consumen. No hay grind: no se puede hacer todo.
- **Teclado:** `1`–`6` cambian de sección (o eligen una opción si hay una escena abierta), `M` un mes, `T` fin de temporada, `I` hasta algo importante, `?` ayuda, `Esc` cierra ventanas.

## Qué hay en el juego

| Sistema | Resumen |
|---|---|
| Tiempo | Meses, temporadas y años; tiempo libre por temporada; resúmenes de temporada y de año. |
| Dificultad | Fácil, Normal, Difícil y Pesadilla: multiplicadores de riesgo, pistas, digestión, pociones, recompensas, daño en combate y huidas (`data/difficulty.js`). En Fácil, hasta tres muertes evitables no llegan: el personaje sobrevive con una secuela, y la biografía lo cuenta. |
| Eventos | Datos con `id, type, rarity, tags, requirements, weight, cooldown, repeatable, narrativeImportance, hiddenRequirements, choices, consequences, delayedConsequences`. Rarezas común / poco común / raro / místico / extraordinario. |
| Memoria y consecuencias | El personaje recuerda favores, traiciones, pactos, pérdidas. Hay verdades ocultas que se descubren tarde (o nunca: aparecen al final, en *Lo que nunca supo*). |
| Personas | NPCs con personalidad, objetivos, miedos, secretos, vida propia (se casan, se mudan, enferman, sospechan, te delatan) y siete ejes de relación. Familia que crece por etapas. |
| Vías | Las 22 vías de la novela, cada una con sus diez Sequences, sus ingredientes, sus habilidades, sus papeles del Método de Actuación y sus escenas: Fool, Visionary, Red Priest, Darkness, Door, Tyrant, Twilight Giant, Hermit, Sun, Hanged Man, Death, Moon, Error, White Tower, Demoness, Paragon, Wheel of Fortune, Mother, Abyss, Chained, Black Emperor y Justiciar. Descubrimiento en etapas con pistas reales, parciales y falsas; los hilos no tienen nombre hasta que se identifican. Como en la novela, quien toma la poción de Bruja (Demoness, Sequence 7) siendo hombre despierta mujer, sin que cambie a quién ama. |
| Investigación | Siete métodos (biblioteca, iglesia, símbolos, documentos, interrogar, clandestino, místico), foco en un hilo, *atar cabos*, rumores que se enfrían. |
| Conocimiento | Hechos, secretos, saber prohibido y entidades; algunos se pagan con cordura. |
| Método de Actuación y digestión | Escenas por vía y Sequence; calidad de la actuación; digestión natural por vivir el papel (hasta en el trabajo). |
| Pociones y Advancement | Para subir de Sequence hace falta: la poción actual digerida, la fórmula de la próxima, sus dos ingredientes (el principal se puede reemplazar por una Característica), el dinero del ritual (del bolsillo o del banco) y cordura suficiente. Todo está a la vista en **Misticismo → Tu camino**, con cómo se consigue cada cosa. **Buscar lo que te falta** (una vez por temporada) empuja siempre hacia el próximo paso: ponerle nombre a una vía, entenderla, la fórmula o un ingrediente. La poción se prepara dentro del ritual, que tiene cuatro pasos y un presentimiento antes de empezar; la primera se prepara y se bebe en la misma noche. Si el ritual falla, la fórmula queda. Lo que frena es la altura: de la Sequence 5 para arriba la poción tarda años en digerirse, las fórmulas y los ingredientes casi no circulan (las organizaciones sólo se los confían a quien tiene su confianza y el mercado negro no pasa de la Sequence 5) y ningún ritual de semidiós es seguro. |
| Sequence 0 | Una cadena de acontecimientos extraordinarios, un ascenso que puede fallar y un modo divino que cambia la interfaz. |
| Combate | Táctico: distancia, entorno, estados, arquetipos de enemigos, información oculta de la Sequence rival (??? → rango → estimación → exacta), la Sequence pesa (un rival más débil pega menos y es más fácil dejarlo atrás, y cada huida fallida acerca la siguiente), heridas que quedan, huir o hablar como opciones reales. A quien te estudió durante años, o a un Santo que perdió el control, cuesta mucho sacárselos de encima. |
| Facciones | Iglesias, Nighthawks, MI9, la Orden de la Aurora, la Mente Colmena, los Alquimistas de la Psicología… acceso, mérito, pedidos, deberes, sospecha, persecución, traición. |
| Tarot Club | Rumores → pruebas que no sabés que son pruebas → invitación → reuniones. Un Beyonder termina oyendo hablar del club aunque no lo busque, y cuando el Loco decide invitarte, la invitación llega. |
| Mundo | Nueve ciudades vivas —Backlund, Tingen, Bayam, Pritz Harbor, un pueblo sin nombre, Trier (Intis), Constant, Enmat Harbor y Balam Oriental—, cada una con su economía, sus facciones, sus oficios, sus lugares para explorar, sus rumores, sus eventos y (en Trier) sus nombres. Historia del mundo libre, canon o alternativa, y la atención del mundo oculto. |
| La segunda mitad de la vida | Padres que cuidar, hijos en problemas, amigos que se mueren primero, traslados, inversiones, testamento, nietos, confesiones… y, para los Beyonders, no envejecer al ritmo de los demás. De la Sequence 6 hacia arriba: la convergencia, los que te estudian, alguien que te reza, el tiempo que pasa distinto, algo más grande que te mira. |
| Linaje | Al final de una vida, si tenés hijos o discípulos vivos, podés seguir como cualquiera de ellos, con su edad, su trabajo y su propia familia. El mundo sigue igual: el mismo año, la misma ciudad, las mismas organizaciones y la historia del mundo. El heredero recibe su parte de la herencia según el testamento (quien queda viudo se queda con una parte y, si lo pediste, otra va a la caridad), la casa y las propiedades, el baúl de la familia (libros, fórmulas, ingredientes y artefactos: lo prestado vuelve a su dueño y la carta del Tarot no se hereda), tu diario (que enseña algo de lo que sabías, incluido el Método de Actuación) y, si eras Beyonder, tu Característica, salvo que se la haya llevado quien te mató, la Iglesia o la niebla. Lo que sabías no se hereda, salvo que el heredero supiera lo que eras. El apellido pesa: la gente y las organizaciones que te conocían miran distinto a tu familia. Tus antepasados, con sus biografías, quedan en **Personas → Tu linaje**. Desde los 60 años podés cerrar tu vida sin morir: te retirás del mundo y la historia pasa a tu familia o a quien aprendió de vos. |
| Economía e inventario | Sueldo, gastos, banco, deuda con cuotas, vivienda, propiedades, inflación. Inventario por categorías con procedencia, usos y riesgos. |
| Artefactos sellados | Veinte objetos con grado, efectos, contras, activación, comportamiento oculto, origen y a veces dueño anterior o ciudad de origen. |
| Tu organización | Desde la Sequence 6 (un culto, desde la 5): una sociedad secreta, una orden o un culto, con nombre propio. Cada temporada le pedís una cosa: reclutar, buscar lo que te falta, juntar fondos, vigilar por vos, investigar o pasar a la clandestinidad. Si la atendés, crece sola; si la abandonás, se deshace. Junta plata en su caja, abre sedes en otras ciudades y, si pierde el secreto, las facciones que la vigilan preguntan, y a veces entran. Tiene sus propias escenas: fanáticos, cismas, deudas, una Iglesia que ofrece protección. Su gente te sostiene como ancla, y eso cuenta para la Sequence 0 (la de un culto, mucho más: te reza). Cuando tu vida termina, pasa a quien sigue la historia, un poco más chica. |
| Discípulos | Uno desde la Sequence 7, dos desde la 5 y tres desde la 3: alguien que confía en vos y que no camina otra vía. Una lección por temporada (explicar el papel también te ayuda a digerirlo); cuando está listo para la poción, decidís si la pagás y le acompañás, si espera o si la toma por su cuenta. Si sale mal, puede perder el control. Nunca te alcanza: si sos Sequence 5, llega como mucho a la 6. Te traen ingredientes y pistas, hacen preguntas difíciles, se van, a veces te traicionan. Y pueden heredar: al final de tu vida, la historia puede seguir con tu discípulo, que conserva su vía y su Sequence y recibe tus cuadernos, tu Característica y la conducción de tu organización. Si hay familia, la plata y la casa quedan para ella y el discípulo recibe un legado, salvo que el testamento le deje casi todo. |
| Épocas del mundo | Cuando la historia conocida se termina, el mundo sigue cambiando: la luz eléctrica, los motores, una guerra de todas las potencias, la radio, las ciudades gigantes y, al final, una época en la que lo místico vuelve. Cada época cambia las ciudades, y un personaje muy viejo la recuerda a su manera. Con los años llegan los bisnietos, las reuniones de cuatro generaciones y la muerte de la última persona que te conoció de joven. |
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
node tests/scenarios.js      # 32 escenarios dirigidos: las 22 vías, el ascenso, el combate, el linaje, tu organización, los discípulos, las épocas, Tarot Club, Sequence 0, finales, migración v7, modo fácil, ciudades, artefactos...
node tests/simulate.js 40    # 40 vidas completas con un "jugador" automático: errores, bloqueos, estado serializable y balance
node tests/simulate.js 10 --ui   # lo mismo, dibujando todas las pestañas con un DOM simulado
node tests/simulate.js 40 --diff=easy --style=dedicado --funnel
                             # balance: dificultad fija, estilo de jugador (mixto, dedicado o tranquilo)
                             # y el "embudo" del camino místico (a qué edad se llega a cada paso, cuántos
                             # rituales se intentan y cuántos salen bien, y en qué Sequence se muere peleando)
node tests/simulate.js 40 --style=mixto --combat
                             # cuánto se pelea y cuánto se muere: por etapa, enemigo, origen y salud al empezar
node tests/simulate.js 30 --lineage
                             # cuando una vida termina, sigue con un heredero (hasta cuatro generaciones)
node tests/simulate.js 40 --events
                             # qué eventos pasaron en alguna vida jugada "de verdad" y cuáles nunca
node tests/fuzz.js 3         # fuerza cada evento y cada opción, cada misión, acción de NPC, evento del mundo y rumor,
                             # en nueve estados de vida, y avisa qué eventos no pudo disparar nunca
node tests/ui-smoke.js       # navegador real (Playwright): escritorio, móvil, una partida v7 migrada, el linaje y lo que se deja
                             # (fundar una orden, tomar un discípulo, enseñarle y seguir la historia con esa persona)
```

## Partidas guardadas

`SAVE_VERSION = 8`. Las partidas de versiones anteriores (v6 y v7) se migran solas al cargarlas (`migrateSave` en `systems/save.js`): se conservan personaje, memoria, diario, hitos, NPCs, dinero, vía, Sequence, conocimiento (convertido en pistas), ingredientes, libros y artefactos. Una decisión o un encargo que haya quedado abierto se reabre si esa misma escena existe en esta versión; sólo se pierden las prácticas de actuación y los rituales a medio hacer (cambiaron por completo), con una nota en el diario. Un combate en curso se retoma si el enemigo existe en la versión nueva.

Las partidas v8 ya empezadas reciben solas el contenido nuevo (ciudades, eventos, encargos, artefactos) y se reparan al cargar: si quedaron atrapadas en la "guerra corta" del mundo libre, que antes no terminaba nunca, la paz queda agendada. Con el ascenso simplificado, una poción que ya estaba preparada cuenta como requisito cumplido, una preparación a medio hacer se termina como antes y un ritual de Advancement que haya quedado abierto con la versión anterior (de cinco pasos) se cierra solo al retomarlo. Con el linaje, las partidas en curso reciben su historia familiar vacía y pueden seguir con un heredero cuando la vida termine; `SAVE_VERSION` sigue en 8. Las ocho vías nuevas también llegan solas a las partidas en curso: empiezan sin conocimiento, como cualquier vía que todavía no oíste nombrar. Lo mismo la organización propia, los discípulos y las épocas del mundo: una partida en curso empieza sin organización ni discípulos, y las épocas se cuentan desde el nacimiento de su primer personaje (una partida que ya va muy adelantada las recibe una por mes, hasta ponerse al día).
