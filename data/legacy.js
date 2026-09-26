'use strict';
/* =========================================================================
   data/legacy.js — lo que deja una vida larga.
   - ORG_KINDS: las organizaciones que un Beyonder puede fundar (ver
     systems/organization.js). Cada tipo tiene su costo, cuánto crece, cuánto
     se expone y cuánto de su gente te sostiene como ancla.
   - ORG_NAME_PARTS: con qué se arman los nombres que se proponen al fundar.
   - WORLD_ERAS: cómo cambia el mundo cuando la historia conocida se termina
     (años contados desde el nacimiento del primer personaje de la partida;
     siguen corriendo a través del linaje). Ver eraTick en systems/world.js.
   ========================================================================= */
const ORG_KINDS = {
  sociedad: {
    label:'Una sociedad secreta', short:'la sociedad', noun:'sociedad', minSeq:6, cost:800,
    startMembers:[4,7], secrecy:75, influence:15,
    desc:'Un círculo discreto de gente que sabe cosas: estudiosos, curiosos, algún Beyonder. Se reúnen, comparten lo que encuentran y no hablan de más.',
    dues:3, exposure:0.6, followers:0.08, growth:0.9, watchers:['mi9','machinery','nighthawks']
  },
  orden: {
    label:'Una orden', short:'la orden', noun:'orden', minSeq:6, cost:1200,
    startMembers:[3,6], secrecy:60, influence:20,
    desc:'Gente que jura proteger algo (una ciudad, un secreto, a los que no saben defenderse) y aprende a pelear para eso.',
    dues:2, exposure:0.8, followers:0.15, growth:0.8, watchers:['mi9','nighthawks','storm']
  },
  culto: {
    label:'Un culto', short:'el culto', noun:'culto', minSeq:5, cost:400,
    startMembers:[5,10], secrecy:55, influence:20,
    desc:'Gente que cree en vos. No en tu dios: en vos. Te rezan, te obedecen y dan lo que tienen. Las Iglesias no perdonan esto.',
    dues:5, exposure:1.3, followers:0.5, growth:1.3, watchers:['church','nighthawks','storm']
  }
};
const ORG_KIND_KEYS = Object.keys(ORG_KINDS);
const ORG_NAME_PARTS = {
  sociedad: {forms:['La Sociedad de {x}', 'El Círculo de {x}', 'Los Amigos de {x}'],
    x:['la Lámpara', 'la Llave de Bronce', 'la Biblioteca Cerrada', 'la Estrella Fija', 'la Pluma Negra', 'los Martes', 'la Vela Quieta', 'la Puerta Azul']},
  orden: {forms:['La Orden de {x}', 'Los Guardianes de {x}', 'La Hermandad de {x}'],
    x:['la Vigilia', 'la Llama Quieta', 'la Puerta Cerrada', 'la Espada de Plata', 'la Última Hora', 'la Niebla', 'la Campana', 'los Siete Faroles']},
  culto: {forms:['Los Hijos de {x}', 'Los que Esperan a {x}', 'La Iglesia de {x}'],
    x:['{nombre}', '{nombre}', '{rol}', 'la Llama que Escucha', 'la Mano que Responde', 'la Voz en el Sueño']}
};

const WORLD_ERAS = [
  {id:'electric', after:62, title:'La luz eléctrica',
    text:'Las calles cambian los faroles de gas por lámparas eléctricas. Las noches ya no son tan oscuras, y los que se escondían en ellas tienen que aprender a esconderse de otra manera.',
    old:'Te acordás de cuando el farolero pasaba al atardecer con su vara, prendiendo la calle de a una llama. Los chicos de ahora no saben lo que es una calle a oscuras.',
    effect:{allCities:{prosperity:5}, mysticBoost:-0.04}},
  {id:'engines', after:96, title:'Los motores',
    text:'Carros sin caballos, trenes más rápidos, barcos que no esperan al viento. Las ciudades crecen hacia afuera y la gente se muda más que nunca.',
    old:'Cruzás la calle y un carro sin caballos casi te lleva por delante. El que maneja te insulta como si el viejo fueras vos. Tiene razón: lo sos, aunque no se te note.',
    effect:{allCities:{prosperity:4, security:-4}}},
  {id:'great_war', after:128, title:'La guerra de todas las potencias',
    text:'Esta vez no es una guerra entre dos reinos: son todos contra todos, con máquinas que nadie había visto. Dura cuatro años. Nadie sale igual.',
    old:'Ya viste guerras. Ninguna así. Los chicos que salen en los trenes tienen la edad que tenían tus nietos cuando eran chicos, y cantan las mismas canciones que cantaban los de la otra guerra.',
    effect:{allCities:{prosperity:-12, security:-12}, war:true, endsAfter:48}},
  {id:'radio', after:158, title:'Voces en el aire',
    text:'Aparatos que atrapan voces de otras ciudades. Una noticia cruza el reino en un minuto. Es más fácil saber lo que pasa, y más difícil que algo pase sin que nadie se entere.',
    old:'En la sala de tu casa, una caja de madera habla con la voz de alguien que está a cien kilómetros. Te acordás de cuando esperabas cartas durante meses.',
    effect:{mysticBoost:-0.04}},
  {id:'giant_cities', after:194, title:'Ciudades que no duermen',
    text:'Las ciudades ya no terminan: se tocan unas con otras. Hay edificios más altos que las catedrales, y luz a toda hora.',
    old:'Desde la ventana de un piso quince mirás el barrio donde naciste. No queda nada. Sólo la curva de la calle, que nadie pensó en enderezar.',
    effect:{allCities:{prosperity:8}}},
  {id:'new_epoch', after:232, title:'Otra época',
    text:'Algo cambia en el mundo, y esta vez no es una máquina: los sueños se vuelven más nítidos, los milagros vuelven a los diarios y los viejos rezos, a las iglesias llenas.',
    old:'Hace dos siglos presentiste que el mundo tenía un lado oculto. Ahora el mundo entero lo presiente, y nadie sabe que vos estabas ahí desde antes.',
    effect:{mysticBoost:0.25}}
];
