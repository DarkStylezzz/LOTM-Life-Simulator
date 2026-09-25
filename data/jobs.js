'use strict';
/* =========================================================================
   data/jobs.js — trabajos, educación y estilo de vida (§4, §23, §32).
   La clave de cada trabajo es su nombre visible (character.profesion), así
   los saves viejos —que guardaban 'Obrero', 'Oficinista', etc.— siguen
   apuntando al mismo registro sin migración.
   - salary: sueldo mensual base (se escala con ciudad, prosperidad,
     inflación y desempeño; ver systems/economy.js).
   - edu: rango educativo mínimo (ver EDUCATION_RANK).
   - time: modificador de tiempo libre por temporada.
   - risk: desgaste físico mensual.
   - align: {pathway:[sequences]} — trabajos que encajan con el rol de una
     Sequence. Vivir tu rol en tu propio trabajo digiere la poción de a poco
     (ver systems/digestion.js). Es la costura principal entre vida mundana
     y misticismo: elegir trabajo también es elegir cómo digerís.
   ========================================================================= */
const JOBS = {
  'Desempleado':            {tier:0, salary:0,   edu:0, time:2,  risk:0,    tags:[], desc:'Sin trabajo fijo. Mucho tiempo libre y poca plata.'},
  'Estudiante':             {tier:0, salary:0,   edu:0, time:0,  risk:0,    tags:['study'], desc:'Tu ocupación es estudiar.'},
  'Obrero':                 {tier:1, salary:60,  edu:0, time:0,  risk:0.2,  tags:['manual'], desc:'Fábricas y talleres: jornadas largas, sueldo corto.', next:['Capataz','Oficinista']},
  'Estibador':              {tier:1, salary:62,  edu:0, time:0,  risk:0.35, tags:['manual','sea'], port:true, desc:'Cargar y descargar barcos en el puerto.', align:{tyrant:[9,8], twilightGiant:[9]}},
  'Marinero':               {tier:1, salary:68,  edu:0, time:-1, risk:0.3,  tags:['sea'], port:true, desc:'Meses en el mar, semanas en tierra.', align:{tyrant:[9,8,7,6]}},
  'Vendedor ambulante':     {tier:1, salary:45,  edu:0, time:1,  risk:0.05, tags:['social','street'], desc:'Vender lo que sea a quien sea.', align:{error:[9,8], fool:[8]}},
  'Aprendiz de relojero':   {tier:1, salary:48,  edu:0, time:0,  risk:0,    tags:['meticulous'], desc:'Engranajes diminutos y paciencia infinita.', align:{whiteTower:[9], error:[7]}},
  'Guardia nocturno':       {tier:1, salary:58,  edu:0, time:0,  risk:0.15, tags:['night'], desc:'Vigilar depósitos mientras la ciudad duerme.', align:{darkness:[9,8,7]}},
  'Enterrador':             {tier:1, salary:50,  edu:0, time:0,  risk:0.05, tags:['death'], desc:'Cavar, cerrar y callar.', align:{death:[9,8,7]}},
  'Adivino/a de feria':     {tier:1, salary:50,  edu:0, time:1,  risk:0,    tags:['public','mystic'], desc:'Cartas, bola de cristal y mucha lectura de gente.', align:{fool:[9], door:[7], visionary:[9]}},
  'Artista de variedades':  {tier:1, salary:55,  edu:0, time:0,  risk:0.05, tags:['public','performance'], desc:'Chistes, canciones y trucos en teatros baratos.', align:{fool:[8,7], sun:[9]}},
  'Boxeador/a':             {tier:1, salary:58,  edu:0, time:0,  risk:0.6,  tags:['violence'], desc:'Peleas por dinero en galpones con humo.', align:{twilightGiant:[9,8], tyrant:[8], redPriest:[8]}},
  'Cazador/a':              {tier:1, salary:55,  edu:0, time:0,  risk:0.3,  tags:['hunt','outdoor'], desc:'Pieles, carne y rastros en los bosques de alrededor.', align:{redPriest:[9], moon:[8]}},
  'Pintor/a':               {tier:1, salary:50,  edu:0, time:1,  risk:0,    tags:['art','performance'], desc:'Retratos por encargo, cuadros que nadie compra y alguna noche en que la tela se pinta sola.', align:{visionary:[9,8], fool:[7]}},
  'Barquero/a':             {tier:1, salary:52,  edu:0, time:0,  risk:0.15, tags:['sea','street'], port:true, desc:'Cruzar gente y bultos de una orilla a la otra sin preguntar qué llevan.', align:{error:[9], tyrant:[9]}},
  // Trabajos que sólo existen en ciertas ciudades (cities).
  'Minero/a':               {tier:1, salary:66,  edu:0, time:0,  risk:0.45, tags:['manual','underground'], cities:['constant'], desc:'Bajar todos los días a donde no llega el sol. Algunos días, subir.', align:{twilightGiant:[9,8], darkness:[9]}},
  'Guía de la selva':       {tier:1, salary:58,  edu:0, time:0,  risk:0.35, tags:['hunt','outdoor'], cities:['balam'], desc:'Llevar colonos, cazadores y locos por senderos que la selva cambia de lugar.', align:{redPriest:[9,8], death:[9], moon:[9]}},
  'Capataz de plantación':  {tier:2, salary:92,  edu:0, time:-1, risk:0.2,  tags:['command','outdoor'], cities:['balam'], desc:'Hacer trabajar a otros bajo el sol del sur. Algunos te odian en silencio; otros, no tan en silencio.', align:{tyrant:[8], redPriest:[7]}},
  'Mozo/a de café':         {tier:1, salary:54,  edu:0, time:0,  risk:0,    tags:['social','street'], cities:['trier'], desc:'Café, ajenjo y conversaciones de revolucionarios, poetas y espías que creen que no escuchás.', align:{visionary:[9], fool:[8]}},
  'Capataz':                {tier:2, salary:95,  edu:0, time:0,  risk:0.1,  tags:['manual','command'], desc:'Mandar sobre los que antes eran tus compañeros.', next:['Puesto directivo']},
  'Oficinista':             {tier:2, salary:115, edu:2, time:0,  risk:0,    tags:['intellectual'], desc:'Papeles, sellos y un escritorio propio.', next:['Comerciante','Periodista','Puesto directivo']},
  'Periodista':             {tier:2, salary:100, edu:2, time:0,  risk:0.05, tags:['intellectual','social','investigation'], desc:'Preguntar lo que otros no se animan.', align:{hermit:[9], whiteTower:[8], visionary:[9]}},
  'Maestro/a':              {tier:2, salary:95,  edu:2, time:0,  risk:0,    tags:['intellectual','care'], desc:'Enseñar a chicos que no quieren aprender.', align:{whiteTower:[9], sun:[9]}},
  'Enfermero/a':            {tier:2, salary:90,  edu:2, time:-1, risk:0.1,  tags:['care'], desc:'Turnos largos entre enfermos y moribundos.', align:{moon:[9], sun:[8], death:[9]}},
  'Boticario/a':            {tier:2, salary:105, edu:2, time:0,  risk:0.05, tags:['care','meticulous'], desc:'Frascos, balanzas y recetas que a veces funcionan.', align:{moon:[9,6], hermit:[7]}},
  'Policía':                {tier:2, salary:100, edu:1, time:-1, risk:0.4,  tags:['violence','investigation'], desc:'Patrullas, informes y cosas que no entran en ningún informe.', align:{redPriest:[9,6], whiteTower:[7], darkness:[9]}},
  'Clérigo/a':              {tier:2, salary:75,  edu:2, time:0,  risk:0,    tags:['faith','care'], desc:'Misas, confesiones y consuelo.', align:{sun:[9,8,7], death:[6]}},
  'Bibliotecario/a':        {tier:2, salary:85,  edu:2, time:1,  risk:0,    tags:['intellectual','quiet'], desc:'Silencio, polvo y libros que nadie pide.', align:{whiteTower:[9], hermit:[9]}},
  'Comerciante':            {tier:3, salary:190, edu:1, time:0,  risk:0,    tags:['social','money'], desc:'Comprar barato, vender caro y sonreír siempre.', next:['Puesto directivo'], align:{error:[8], fool:[8]}},
  'Detective privado':      {tier:3, salary:150, edu:2, time:0,  risk:0.25, tags:['investigation'], desc:'Maridos infieles, deudas y, a veces, algo peor.', align:{whiteTower:[8,7], visionary:[9,8], hermit:[9]}},
  'Médico/a':               {tier:3, salary:230, edu:3, time:-1, risk:0.05, tags:['care','intellectual'], desc:'Salvar vidas y firmar certificados de defunción.', align:{moon:[6], sun:[8]}},
  'Psiquiatra':             {tier:3, salary:210, edu:3, time:0,  risk:0,    tags:['care','mind'], desc:'Escuchar lo que la gente no le cuenta a nadie.', align:{visionary:[7,6,5]}},
  'Abogado/a':              {tier:3, salary:240, edu:3, time:-1, risk:0,    tags:['social','intellectual'], desc:'Contratos, pleitos y promesas con letra chica.', align:{sun:[6], error:[8]}},
  'Profesor/a universitario/a': {tier:3, salary:200, edu:4, time:0, risk:0, tags:['intellectual'], desc:'Cátedras, polémicas y bibliotecas enteras a tu disposición.', align:{whiteTower:[6,5], hermit:[6]}},
  'Puesto directivo':       {tier:4, salary:360, edu:1, time:-1, risk:0,    tags:['command','money'], desc:'Decidir sobre el trabajo de muchos otros.'},
  'Retirado/a':             {tier:0, salary:0,   edu:0, time:2,  risk:0,    tags:[], desc:'Ya trabajaste lo suficiente.'}
};
// Escalera "natural" del sistema anterior (se conserva como preferencia al
// buscar empleo: es lo que la gente suele conseguir después de cada puesto).
const JOB_UPGRADES = {
  'Desempleado':'Obrero', 'Obrero':'Oficinista', 'Estudiante':'Oficinista',
  'Oficinista':'Comerciante', 'Comerciante':'Puesto directivo'
};
const EDUCATION_RANK = {
  'Sin escolarizar':0, 'Primaria (en curso)':0, 'Primaria completa':1, 'Secundaria (en curso)':1,
  'Secundaria completa':2, 'Universitaria (en curso)':2, 'Universitaria completa':3, 'Posgrado':4, 'Autodidacta':1
};
// Cuánto ayuda cada nivel educativo a conseguir un puesto mejor (sistema original).
const EDUCATION_JOB_BONUS = {
  'Sin escolarizar':0, 'Primaria (en curso)':0,
  'Primaria completa':0, 'Secundaria (en curso)':0, 'Secundaria completa':0.10,
  'Universitaria (en curso)':0.15, 'Universitaria completa':0.25, 'Posgrado':0.35, 'Autodidacta':0.05
};
// Estilo de vida (§32): cuánto gastás por mes y qué te devuelve eso.
const LIFESTYLES = {
  austero:{label:'Austero', living:22, rent:10, desc:'Lo justo. Se ahorra, pero se nota en el cuerpo y en el ánimo.', monthly:{sanity:-0.25, salud:-0.08}},
  normal: {label:'Normal',  living:38, rent:16, desc:'Una vida modesta y digna.', monthly:{}},
  comodo: {label:'Cómodo',  living:90, rent:40, desc:'Buena comida, buena ropa, un poco de lujo. Se ve y se siente.', monthly:{sanity:0.25, salud:0.1, reputation:0.05}}
};
// Asignación mensual mientras vivís con tu familia (antes de los 18).
const ALLOWANCE_BY_CLASS = {Baja:1, Media:3, Alta:8};
// Costo de una temporada de universidad.
const TUITION_PER_SEASON = 55;
