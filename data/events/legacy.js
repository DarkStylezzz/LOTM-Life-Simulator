'use strict';
/* =========================================================================
   data/events/legacy.js — lo que pasa en una vida larga: tu organización,
   tus discípulos, las épocas del mundo y la familia que sigue creciendo.
   Ver systems/organization.js, systems/disciples.js y eraTick en
   systems/world.js.
   ========================================================================= */
const EVENTS_LEGACY = [
  /* ============================== tu organización ============================== */
  {id:'org_raid', type:'threat', rarity:'rare', tags:['org','faction'], weight:0, cooldown:24, chainOnly:true, narrativeImportance:3,
    context:(ctx)=>{ if(!STATE.org) return null; ctx.faction = ctx.faction || pick(orgKind().watchers); return ctx; },
    title:'La puerta',
    text:(ctx)=>`Una madrugada, gente de ${factionShort(ctx.faction || 'church')} entra en la casa donde se reúne ${STATE.org ? STATE.org.name : 'tu gente'}. Tienen una lista. Tu nombre todavía no está.`,
    choices:[
      {label:'Ir a defenderlos', small:'Pelear. Si ganás, no cae nadie.', requires:()=>!!STATE.org,
        run:(ctx)=>{ STATE.org.secrecy = clamp(STATE.org.secrecy + 10, 0, 100); startCombat(factionAgentFor(ctx.faction || 'church'), {env:'night', source:'el allanamiento'});
          return 'Llegás antes de que terminen de revisar el sótano.'; }},
      {label:'Avisarles que se dispersen', small:'Se salva la mayoría. Algunos no vuelven nunca.', requires:()=>!!STATE.org,
        run:()=>{ const o = STATE.org; const lost = Math.max(1, Math.round(o.members * rnd(0.25, 0.4))); o.members = Math.max(1, o.members - lost);
          o.secrecy = clamp(o.secrecy + 20, 0, 100); o.influence = clamp(o.influence - 8, 0, 100);
          return `Corre la voz a tiempo. Cuando entran, la casa está casi vacía: quedan ${lost} que no quisieron irse o no se enteraron. No los volvés a ver.`; }},
      {label:'Entregarles a alguien', small:'Un nombre, a cambio de que se vayan.', requires:()=>!!STATE.org,
        run:()=>{ const o = STATE.org; const inner = orgInnerNpcs().filter(n=>n.lifeState === 'presente'); const v = inner.length ? pick(inner) : null;
          o.secrecy = clamp(o.secrecy + 15, 0, 100); o.influence = clamp(o.influence - 4, 0, 100);
          applyEffects({humanity:-3, sanity:[-6,-3]});
          if(v){ v.lifeState = 'desaparecido'; o.inner = o.inner.filter(id=>id !== v.id);
            remember('org_sacrifice', `Entregaste a ${v.name} para salvar ${o.name}.`, {cat:'betrayal', npc:v.id});
            return `Das el nombre de ${v.name}. Se lo llevan esa misma noche. Los demás no saben que fuiste vos. Vos sí.`; }
          remember('org_sacrifice', `Entregaste a alguien para salvar ${o.name}.`, {cat:'betrayal'});
          return 'Das un nombre: el de alguien que casi no conocías. Se lo llevan. Los demás no saben que fuiste vos.'; }},
      {label:'No hacer nada', small:'Que se arreglen solos.',
        run:()=>{ const o = STATE.org; if(!o) return 'Ya no queda nada que proteger.'; o.members = Math.max(1, Math.round(o.members * 0.6)); o.influence = clamp(o.influence - 12, 0, 100);
          return 'No vas. A la mañana siguiente faltan muchos. Los que quedan saben que no fuiste.'; }}
    ]},
  {id:'org_zealots', type:'faction', rarity:'uncommon', tags:['org','culto'], weight:4, cooldown:36, narrativeImportance:2,
    hiddenRequirements:()=>!!STATE.org && STATE.org.kind === 'culto' && STATE.org.members >= 12,
    title:'En tu nombre',
    text:()=>`Unos fieles de ${STATE.org.name} quemaron la puerta de una capilla que "hablaba mal de vos". No hubo heridos. Todavía. Te esperan para saber si hicieron bien.`,
    choices:[
      {label:'Condenarlos delante de todos', small:'Que quede claro qué no se hace.',
        run:()=>{ const o = STATE.org; o.influence = clamp(o.influence - 5, 0, 100); o.members = Math.max(1, Math.round(o.members*0.9)); o.secrecy = clamp(o.secrecy + 5, 0, 100); applyEffects({humanity:1});
          return 'Les pedís que se arrodillen delante de los demás y pidan perdón. Algunos se van esa misma noche. Los que se quedan te tienen más miedo que antes, y menos fe.'; }},
      {label:'No decir nada', small:'Que interpreten tu silencio.',
        run:()=>{ const o = STATE.org; o.influence = clamp(o.influence + 4, 0, 100); raiseAttention(rndInt(3,6)); factionAdjust('church', {suspicion:[4,8]}, true);
          return 'No decís nada. Ellos entienden que sí. La semana siguiente, otra capilla amanece con un símbolo pintado en la puerta.'; }},
      {label:'Premiarlos', small:'La fe se alimenta.',
        run:()=>{ const o = STATE.org; o.influence = clamp(o.influence + 8, 0, 100); o.members += rndInt(4,9); o.peak = Math.max(o.peak, o.members);
          applyEffects({corruption:[2,5], humanity:-2}); raiseAttention(rndInt(4,8)); factionAdjust('church', {suspicion:[6,12]}, true);
          return 'Les apoyás la mano en la cabeza, uno por uno. Esa noche llegan caras nuevas. Todas quieren una misión.'; }}
    ]},
  {id:'org_schism', type:'faction', rarity:'rare', tags:['org'], weight:3, cooldown:60, narrativeImportance:3,
    context:(ctx)=>{ if(!STATE.org || STATE.org.members < 18) return null; const n = orgInnerNpcs().filter(x=>x.lifeState==='presente').sort((a,b)=>(b.respect||0)-(a.respect||0))[0]; if(!n) return null; ctx.npc = n; return ctx; },
    title:'Alguien quiere tu lugar',
    text:(ctx)=>`${ctx.npc.name} dice en voz alta, en plena reunión, lo que otros piensan en voz baja: que ${STATE.org.name} necesita a alguien que esté más presente. Alguien como ${ng(ctx.npc,'él','ella')}.`,
    choices:[
      {label:'Expulsar a {npc}', small:'Cortar por lo sano.',
        run:(ctx)=>{ const o = STATE.org, n = ctx.npc; const lost = Math.round(o.members * rnd(0.15,0.3)); o.members = Math.max(1, o.members - lost); o.influence = clamp(o.influence + 4, 0, 100);
          o.inner = o.inner.filter(id=>id !== n.id); n.flags.orgMember = false; n.role = 'Ex ' + n.role.charAt(0).toLowerCase() + n.role.slice(1);
          adjustRel(n, {trust:-30, affection:-25, loyalty:-40}); n.flags.rival = true;
          return `${n.name} se va, y se lleva a ${lost}. Los que se quedan son menos, y más tuyos.`; }},
      {label:'Darle más poder', small:'Compartir el mando.',
        run:(ctx)=>{ const o = STATE.org, n = ctx.npc; o.influence = clamp(o.influence - 6, 0, 100); o.secrecy = clamp(o.secrecy - 3, 0, 100); adjustRel(n, {loyalty:[10,16], respect:[4,8]});
          return `Le das a ${n.name} la conducción del día a día. Funciona mejor de lo que esperabas. A veces te preguntás para qué te necesitan.`; }},
      {label:'Hablarle a solas', small:'Recordarle quién le enseñó todo.',
        run:(ctx)=>{ const n = ctx.npc, o = STATE.org;
          if(chance(0.35 + (n.loyalty||0)/200 + Math.max(0, STATE.character.reputation)/300)){ adjustRel(n, {loyalty:[8,14], respect:[3,6]}); return `Hablan hasta el amanecer. En la reunión siguiente, ${n.name} pide disculpas en público.`; }
          o.members = Math.max(1, Math.round(o.members*0.85)); adjustRel(n, {trust:-15, loyalty:-20});
          return `${n.name} te escucha con una sonrisa educada y no cambia de idea. A la semana siguiente falta un grupo entero a la reunión.`; }}
    ]},
  {id:'org_gift', type:'faction', rarity:'uncommon', tags:['org'], weight:4, cooldown:24,
    hiddenRequirements:()=>!!STATE.org && STATE.org.members >= 8,
    run:()=>{ const o = STATE.org; const m = STATE.pathway.chosenPathway ? nextMissing() : null;
      if(m && m.kind === 'ingredient' && chance(0.6)){ addIngredient(m.pathway, m.seq, m.name, rndInt(55,85), o.name);
        return {title:'Un regalo', text:`Alguien de ${o.name} te deja un paquete en la puerta, sin firma. Adentro: ${m.name}. Nadie se hace cargo, y todos sonríen cuando te ven.`}; }
      const v = Math.round(rndInt(60,180)*priceIndex()); applyEffects({cash:v, sanity:[1,3]});
      return {title:'Un regalo', text:`Los de ${o.name} juntaron plata entre todos "para lo que haga falta": ${fmtMoney(v)}. No preguntan para qué.`}; }},
  {id:'org_newblood', type:'faction', rarity:'uncommon', tags:['org','disciple'], weight:3, cooldown:48, narrativeImportance:2,
    hiddenRequirements:()=>!!STATE.org && STATE.org.members >= 6,
    title:'Alguien que promete',
    text:()=>`Entre los nuevos de ${STATE.org.name} hay alguien distinto: pregunta lo que nadie pregunta y sueña cosas que no debería saber. Los demás ya lo notaron.`,
    choices:[
      {label:'Tomarle bajo tu ala', small:'Si tu Sequence lo permite, puede aprender de vos.',
        run:()=>{ const o = STATE.org;
          const n = createNpc({relType:'contact', tier:'recurrente', ageMin:17, ageMax:26, met:true, allowHidden:false, trust:rndInt(45,60), respect:rndInt(45,60), loyalty:rndInt(35,55), affection:rndInt(25,40)});
          n.role = orgMemberRole(n, o.kind); n.flags.orgMember = true; n.mystic = Math.max(n.mystic||0, 45);
          o.inner = (o.inner||[]).filter(id=>{ const x = npcById(id); return x && x.alive; }); if(o.inner.length < 5) o.inner.push(n.id);
          if(canTakeDisciple(n)) return `Se llama ${n.name}. ${offerDiscipleship(n)}`;
          return `Se llama ${n.name}. Le das tu tiempo y tu atención. Todavía no podés enseñarle todo lo que sabés, pero ya te mira como si pudieras.`; }},
      {label:'Dejar que crezca por su cuenta', small:'Si vale, va a llegar.',
        run:()=>{ const o = STATE.org; o.influence = clamp(o.influence + 2, 0, 100); return 'No hacés nada especial. Un año después, esa persona ya organiza las reuniones de los martes.'; }}
    ]},
  {id:'org_patron', type:'faction', rarity:'rare', tags:['org','orden'], weight:3, cooldown:120, repeatable:false, narrativeImportance:3,
    hiddenRequirements:()=>!!STATE.org && STATE.org.kind === 'orden' && !STATE.org.sponsor && STATE.org.members >= 15,
    context:(ctx)=>{ const ks = ['church','storm'].filter(f=>!factionHostile(f)); if(!ks.length) return null; ctx.faction = pick(ks); return ctx; },
    title:'Una oferta de arriba',
    text:(ctx)=>`Un emisario de ${factionShort(ctx.faction)} pide verte a solas. Saben de ${STATE.org.name}. No vienen a cerrarla: vienen a ofrecerle protección, a cambio de que les responda.`,
    choices:[
      {label:'Aceptar su protección', small:'A cambio de obediencia.',
        run:(ctx)=>{ const o = STATE.org, k = ctx.faction; o.sponsor = k; o.secrecy = clamp(o.secrecy + 25, 0, 100); o.influence = clamp(o.influence + 8, 0, 100);
          factionMeet(k); factionAdjust(k, {trust:[10,16], access:2, suspicion:-15});
          return `${o.name} pasa a trabajar para ${factionShort(k)}, aunque en los papeles nada cambie. Ya nadie pregunta por ustedes. Ahora te piden cosas.`; }},
      {label:'Rechazarla', small:'Nadie manda sobre lo que fundaste.',
        run:(ctx)=>{ factionAdjust(ctx.faction, {suspicion:[8,14]}, true); STATE.org.influence = clamp(STATE.org.influence + 3, 0, 100);
          return 'El emisario se va sin enojarse. Eso es lo que más te preocupa.'; }}
    ]},
  {id:'org_legend', type:'faction', rarity:'common', tags:['org'], weight:2, cooldown:36,
    hiddenRequirements:()=>!!STATE.org && STATE.org.members >= 25,
    run:()=>{ const o = STATE.org; applyEffects({reputation:[1,3], sanity:[2,4]}); if(o.kind === 'culto') STATE.anchors.followerBonus = (STATE.anchors.followerBonus||0) + 1;
      return {title:'Lo que cuentan de vos', text:`Entre los de ${o.name} circula una historia sobre vos: algo que hiciste hace años, contado con detalles que no pasaron. Cuando la escuchás, no la corregís.`}; }},
  {id:'org_debt', type:'faction', rarity:'uncommon', tags:['org'], weight:3, cooldown:36,
    context:(ctx)=>{ if(!STATE.org) return null; const n = orgInnerNpcs().filter(x=>x.lifeState==='presente')[0]; if(!n) return null; ctx.npc = n; ctx.amount = Math.round(rndInt(80,220)*priceIndex()); return ctx; },
    title:'Uno de los tuyos',
    text:(ctx)=>`${ctx.npc.name} está preso por una deuda que no puede pagar: ${fmtMoney(ctx.amount)}. Los demás miran para ver qué hacés.`,
    choices:[
      {label:'Pagar con la caja de la organización', small:'Para eso está.', requires:(ctx)=>!!STATE.org && STATE.org.treasury >= ctx.amount,
        run:(ctx)=>{ STATE.org.treasury -= ctx.amount; STATE.org.influence = clamp(STATE.org.influence + 3, 0, 100); adjustRel(ctx.npc, {loyalty:[10,16]});
          return `${ctx.npc.name} sale esa tarde. Los demás ${ng(ctx.npc,'lo','la')} reciben con un aplauso.`; }},
      {label:'Pagar de tu bolsillo', small:'Que sepan que no abandonás a nadie.', requires:(ctx)=>canAfford(ctx.amount),
        run:(ctx)=>{ payFromCashOrBank(ctx.amount); if(STATE.org) STATE.org.influence = clamp(STATE.org.influence + 5, 0, 100); adjustRel(ctx.npc, {loyalty:[14,20], dependence:[4,8]});
          return `Pagás sin decir nada. ${ctx.npc.name} se entera después, y no lo olvida nunca.`; }},
      {label:'Dejarle', small:'Cada uno responde por lo suyo.',
        run:(ctx)=>{ if(STATE.org) STATE.org.influence = clamp(STATE.org.influence - 4, 0, 100); adjustRel(ctx.npc, {loyalty:-15, trust:-10});
          return `${ctx.npc.name} pasa seis meses preso. Cuando sale, ya no viene a las reuniones.`; }}
    ]},

  /* ============================== tus discípulos ============================== */
  {id:'dis_ready', type:'pathway', rarity:'uncommon', tags:['disciple'], weight:0, cooldown:0, chainOnly:true, narrativeImportance:3,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente' && discipleCanReach(discipleTarget(n))); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    title:(ctx)=>`${ctx.npc.name}: el paso`,
    text:(ctx)=>{ const n = ctx.npc, t = discipleTarget(n); const r = (ACTING_ROLES[n.disciple.pathway]||{})[t];
      return `${n.name} está ${ng(n,'listo','lista')} para la poción de ${r ? r.role : 'su próxima Sequence'}. Juntar los ingredientes y acompañarle en el ritual cuesta alrededor de ${fmtMoney(disciplePotionCost(t))}. Si sale mal, lo que se pierde no es plata.`; },
    choices:[
      {label:'Conseguir lo necesario y acompañarle', small:'Más seguro. Cuesta.', run:(ctx)=>discipleAdvance(ctx.npc, 'full')},
      {label:'Que espere un poco más', small:'Con más preparación, la próxima vez.', run:(ctx)=>discipleAdvance(ctx.npc, 'wait')},
      {label:'Que lo haga por su cuenta', small:'Sin gastar. Más riesgo.', run:(ctx)=>discipleAdvance(ctx.npc, 'alone')}
    ]},
  {id:'dis_question', type:'pathway', rarity:'common', tags:['disciple'], weight:3, cooldown:24,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente'); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    title:'Una pregunta difícil',
    text:(ctx)=>`${ctx.npc.name} te pregunta de repente si vale la pena. Si todo esto (las pociones, el papel, el miedo a perderse) vale la pena. Espera una respuesta de verdad.`,
    choices:[
      {label:'Decirle la verdad, toda', small:'Lo bueno y lo que cuesta.',
        run:(ctx)=>{ const n = ctx.npc; adjustRel(n, {trust:[6,10], respect:[4,8]}); if(n.disciple) n.disciple.quality = clamp(n.disciple.quality + 6, 0, 100); applyEffects({sanity:[-2,1], digestion:[1,3]});
          return `Le contás lo que te costó cada Sequence. ${n.name} escucha sin interrumpir. Al final dice: "Igual quiero". Te reconocés en esa terquedad.`; }},
      {label:'Decirle que sí, sin dudar', small:'Que no pierda el coraje.',
        run:(ctx)=>{ const n = ctx.npc; adjustRel(n, {loyalty:[4,8], dependence:[3,6]}); if(n.disciple) n.disciple.progress += 8;
          return 'Le decís que sí, que vale la pena. Lo decís con tanta seguridad que casi te lo creés.'; }},
      {label:'Decirle que no lo sabés', small:'Honesto, y difícil de escuchar.',
        run:(ctx)=>{ const n = ctx.npc; adjustRel(n, {respect:[6,10], trust:[2,5]}); applyEffects({humanity:1});
          return `Le decís que no lo sabés, que todavía no lo sabés. ${n.name} se queda en silencio un rato largo. Después te da las gracias.`; }}
    ]},
  {id:'dis_crisis', type:'pathway', rarity:'uncommon', tags:['disciple','control'], weight:3, cooldown:48, narrativeImportance:3,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente' && discipleSeq(n) !== null); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    title:'Se está perdiendo',
    text:(ctx)=>`${ctx.npc.name} no duerme hace días. Habla con voces que no están, se ríe cuando no corresponde y ayer rompió un espejo con la mano. Lo reconocés: está perdiendo el control.`,
    choices:[
      {label:'Quedarte a su lado hasta que pase', small:'Anclarle con lo que tengas.',
        run:(ctx)=>{ const n = ctx.npc; applyEffects({sanity:[-8,-4]}); adjustRel(n, {loyalty:[10,16], trust:[8,12], dependence:[4,8]}); if(n.disciple) n.disciple.quality = clamp(n.disciple.quality + 5, 0, 100);
          return `Tres noches sin dormir, hablándole de quién era antes de todo esto. La cuarta mañana, ${n.name} te pide un café. Volvió.`; }},
      {label:'Encerrarle hasta que se calme', small:'Seguro para los demás.',
        run:(ctx)=>{ const n = ctx.npc; adjustRel(n, {trust:-8, fear:[6,12]});
          return `${ng(n,'Lo','La')} encerrás en el sótano con lo necesario. Grita dos días. Al tercero se calla. Cuando abrís, te mira distinto.`; }},
      {label:'Llevarle a la Iglesia', small:'Ellos saben qué hacer. No siempre lo que querrías.',
        run:(ctx)=>{ const n = ctx.npc; delete n.disciple; n.lifeState = 'lejos'; factionMeet('church'); factionAdjust('church', {trust:[3,6], suspicion:[3,6]});
          remember('disciple_church_'+n.id, `Llevaste a ${n.name} a la Iglesia cuando perdía el control.`, {cat:'choice', npc:n.id});
          return `${ng(n,'Lo','La')} dejás en manos de un diácono que no pregunta de dónde viene. No ${ng(n,'lo','la')} volvés a ver. Una carta, años después, dice que está bien. No sabés si creerla.`; }}
    ]},
  {id:'dis_proud', type:'pathway', rarity:'common', tags:['disciple'], weight:2, cooldown:36,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente' && discipleSeq(n) !== null); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    run:(ctx)=>{ adjustRel(ctx.npc, {loyalty:[3,6]}); applyEffects({sanity:[3,6], reputation:[0,2]});
      return {title:'Orgullo', text:`Te enterás por terceros de que ${ctx.npc.name} salvó a una familia entera de algo que la policía nunca va a entender. No te lo contó. Usó exactamente lo que le enseñaste.`}; }},
  {id:'dis_leave', type:'pathway', rarity:'rare', tags:['disciple'], weight:2, cooldown:60, narrativeImportance:2,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente' && discipleSeq(n) !== null && (n.disciple.lessons||0) >= 6); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    title:'Su propio camino',
    text:(ctx)=>`${ctx.npc.name} te dice que quiere irse: otra ciudad, otra gente, su propia manera de hacer las cosas. Te lo dice con miedo, como si esperara un castigo.`,
    choices:[
      {label:'Darle tu bendición', small:'Para eso le enseñaste.',
        run:(ctx)=>{ const n = ctx.npc; releaseDisciple(n); n.lifeState = 'lejos'; adjustRel(n, {affection:[8,14], loyalty:[6,10]}); applyEffects({sanity:[2,5]});
          return `${ng(n,'Lo','La')} acompañás a la estación. Antes de subir se da vuelta y te dice algo que no se escucha por el silbato. No hace falta.`; }},
      {label:'Pedirle que se quede', small:'Todavía te necesita. O vos a esa persona.',
        run:(ctx)=>{ const n = ctx.npc;
          if(chance(0.3 + (n.loyalty||0)/200 + (n.dependence||0)/200)){ adjustRel(n, {loyalty:[4,8], dependence:[2,5]}); return `${n.name} se queda. No sabés si hiciste bien.`; }
          releaseDisciple(n); n.lifeState = 'lejos'; adjustRel(n, {trust:-6});
          return `${n.name} se va igual, una madrugada, sin despedirse.`; }}
    ]},
  {id:'dis_betrayal', type:'pathway', rarity:'rare', tags:['disciple','betrayal'], weight:2, cooldown:120, narrativeImportance:3,
    context:(ctx)=>{ const l = disciples().filter(n=>n.lifeState==='presente' && (n.loyalty||0) < 30); if(!l.length) return null; ctx.npc = pick(l); return ctx; },
    run:(ctx)=>{ const n = ctx.npc; const k = n.hidden.faction && !factionHostile(n.hidden.faction) ? n.hidden.faction : pick(['church','mi9','nighthawks']);
      releaseDisciple(n); n.flags.rival = true; adjustRel(n, {trust:-30, affection:-20});
      factionAdjust(k, {suspicion:[15,25]}, true); raiseAttention(rndInt(4,8));
      remember('disciple_betrayal_'+n.id, `${n.name} vendió tus secretos.`, {cat:'betrayal', npc:n.id});
      return {title:'Lo que sabía de vos', text:`${n.name} ya no viene a las lecciones. Una semana después, alguien de ${factionShort(k)} sabe cosas de vos que sólo ${ng(n,'él','ella')} sabía.`}; }},

  /* ============================== una vida muy larga ============================== */
  {id:'era_old_times', type:'mundane', rarity:'common', tags:['era','aging'], weight:3, cooldown:60,
    hiddenRequirements:()=>(STATE.world.era||0) > 0 && STATE.character.edad >= 50,
    run:()=>{ const e = WORLD_ERAS[Math.min(WORLD_ERAS.length, STATE.world.era) - 1]; applyEffects({sanity:[-1,2]});
      return {title:'Otro mundo', text:e.old}; }},
  {id:'long_mistaken', type:'pathway', rarity:'uncommon', tags:['aging','beyonder'], requirements:{ageMin:85, beyonder:true, seqMax:6}, weight:3, cooldown:60,
    run:()=>{ applyEffects({sanity:[-3,0], humanity:-1});
      return {title:'Te confunden', text:'En el mercado, una señora muy vieja te agarra del brazo y te llama por tu nombre de hace sesenta años. "Sos igual a alguien que conocí", dice. Le contestás que debe ser algún pariente tuyo. Te cree. O hace como que te cree.'}; }},
  {id:'long_last_witness', type:'pathway', rarity:'uncommon', tags:['aging','beyonder'], requirements:{ageMin:105, beyonder:true}, weight:3, cooldown:120, repeatable:false,
    run:()=>{ applyEffects({sanity:[-6,-2], humanity:-2}); remember('last_witness', 'Murió la última persona que te conoció de joven.', {cat:'loss'});
      return {title:'El último', text:'Leés en el diario la muerte de alguien que fue a la escuela con vos. Tenía más de cien años: era "el vecino más viejo de la ciudad", y la última persona viva que te había visto joven. Ya nadie recuerda tu cara de antes.'}; }},
  {id:'long_historian', type:'pathway', rarity:'rare', tags:['aging','beyonder'], requirements:{ageMin:120, beyonder:true}, weight:2, cooldown:120, repeatable:false, narrativeImportance:2,
    title:'Un libro sobre vos',
    text:'Un historiador publica un libro sobre gente "olvidada" de la ciudad. Hay un capítulo sobre vos, con tu nombre de hace un siglo. Dice que moriste joven. Dice cosas que no pasaron, y una que sí, que nadie debería saber.',
    choices:[
      {label:'Visitarle y corregirle', small:'Con cuidado.',
        run:()=>{ applyEffects({attention:3, sanity:[1,3]}); return `Te presentás como "${gx('un descendiente','una descendiente','une descendiente')}". El historiador te mira mucho rato. Cuando te vas, le oís murmurar: "los mismos ojos".`; }},
      {label:'Dejarlo así', small:'Que el pasado te dé por muerto.',
        run:()=>{ applyEffects({humanity:-1}); raiseAttention(-3); return 'Comprás un ejemplar y lo guardás en un cajón. Es raro leer tu propia muerte. Es más raro no sentir nada.'; }}
    ]},
  {id:'fam_great_grandchild', type:'family', rarity:'uncommon', tags:['grandchildren','descendants'], requirements:{ageMin:66}, weight:3, cooldown:36,
    hiddenRequirements:()=>(STATE.character.grandchildren||0) >= 1 && (STATE.character.greatGrandchildren||0) < (STATE.character.grandchildren||0) * 2,
    run:()=>{ const c = STATE.character; c.greatGrandchildren = (c.greatGrandchildren||0) + 1; applyEffects({sanity:[4,8]});
      addMilestone('family', c.greatGrandchildren === 1 ? 'Nace su primer bisnieto' : 'Nace otro bisnieto');
      remember('great_grandchild', 'Nació un bisnieto.', {cat:'person'});
      return {title:'Un bisnieto', text: c.greatGrandchildren === 1
        ? `Uno de tus nietos te pone en brazos a su bebé. Es tu bisnieto. La primera vez que lo decís en voz alta, te reís ${gx('solo','sola','sole')}.`
        : `Nace otro bisnieto. Ya son ${c.greatGrandchildren}. Te cuesta acordarte de todos los nombres, y te da vergüenza admitirlo.`}; }},
  {id:'fam_reunion', type:'family', rarity:'uncommon', tags:['descendants'], requirements:{ageMin:80}, weight:3, cooldown:60,
    hiddenRequirements:()=>(STATE.character.greatGrandchildren||0) >= 2,
    run:()=>{ const ageless = STATE.pathway.chosenPathway && STATE.pathway.sequence <= 6; applyEffects({sanity:[4,9]});
      return {title:'La familia entera', text: ageless
        ? `Una reunión de familia: más de veinte personas, cuatro generaciones. A vos te presentan como "${gx('un pariente lejano','una pariente lejana','une pariente lejane')}". Los bisnietos no entienden por qué los mayores te miran así. Tus hijos tienen más arrugas que vos.`
        : 'Una reunión de familia: más de veinte personas, cuatro generaciones alrededor de una mesa que no alcanza. Alguien saca una foto. Estás en el medio.'}; }}
];
