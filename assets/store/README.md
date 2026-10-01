# Arte y textos de la tienda

Todo se genera con `node tools/store-assets.js` (Playwright + Chromium). Para cambiar un dibujo, se edita el script y se vuelve a correr.

| Archivo | Uso | Tamaño |
|---|---|---|
| `assets/icon.png` | Icono del juego | 512×512 |
| `assets/thumbnail.png` | Miniatura del juego | 1920×1080 |
| `assets/favicon.svg`, `assets/apple-touch-icon.png` | Pestaña del navegador y acceso directo en el celular | — |
| `assets/store/pases/*.png` | Iconos de pases (medallón redondo, ya pensado para el recorte en círculo) | 512×512 |
| `assets/store/productos/*.png` | Iconos de productos (placa cuadrada) | 512×512 |

## Descripción del juego

**Corta** (155 caracteres, también es la `meta description` de `index.html`):

> Viví una vida entera en el mundo de Lord of the Mysteries: crecé en Backlund o Tingen, descubrí lo oculto, bebé tu primera poción y elegí qué precio pagar.

**Larga** (menos de 1000 caracteres):

```
Nacés en una ciudad y una familia que no elegís. Crecés, trabajás, te enamorás, perdés gente… y un día notás que el mundo esconde algo.

Lo que hagas con eso es tu vida: investigar, callar, beber una poción, unirte a una Iglesia, vender un secreto o sentarte a una mesa sobre la niebla gris.

✦ Las 22 vías de la novela, de la Sequence 9 a la Sequence 0
✦ Pociones, rituales y el Método de Actuación
✦ El Tarot Club: rumores, pruebas, una invitación y las reuniones
✦ Nueve ciudades vivas, de Backlund a Trier
✦ Iglesias, Nighthawks, MI9 y sociedades secretas
✦ Combate táctico, artefactos sellados y una cordura que se gasta
✦ Linaje: cuando tu vida termina, seguís como tu heredero
✦ Muy rara vez, alguien nace atado al Castillo de Sefirah

No hay puntaje. Al final hay una biografía.
```

## Pases

| Icono | Nombre sugerido | Qué representa |
|---|---|---|
| `sefirah.png` | Castillo de Sefirah | El castillo sobre la niebla gris |
| `tarot.png` | Invitación al Tarot Club | La carta 0 del Loco con el ojo carmesí |
| `via.png` | Elegir tu vía | Una rosa de 22 puntas, una por vía |
| `linaje.png` | Linaje | El escudo de la familia con corona |
| `diarios.png` | Partidas extra | Diarios encuadernados con un "+" |
| `vision.png` | Visión Espiritual | El ojo que ve lo que el resto no (números exactos, pistas) |

## Productos

| Icono | Nombre sugerido | Qué representa |
|---|---|---|
| `libras.png` | Bolsa de libras | Monedas de Loen |
| `pocion.png` | Poción | Un frasco con la poción carmesí |
| `caracteristica.png` | Característica Beyonder | Una gema violeta que brilla |
| `formula.png` | Fórmula | Un pergamino con un sello |
| `cordura.png` | Vela de cordura | Una vela que calma |
| `reloj.png` | Segunda oportunidad | Un reloj de bolsillo que vuelve atrás |
