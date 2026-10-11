import {analyze,type Game} from './analytics';
export type TraitSource='zones'|'shots'|'passes'|'defense';
export type TraitsSnapshot={playerId:string;season:number;competition:string;sources:Partial<Record<TraitSource,{fetchedAt:string;data:any}>>};
export type Trait={kind:string;title:string;evidence:string};
const fmt=(v:number)=>v.toLocaleString('es-AR',{maximumFractionDigits:1});
export function playerTraits(games:Game[],advanced:TraitsSnapshot|null,name='Este jugador'){
 const played=games.filter(g=>g.played&&g.minutes>0),traits:Trait[]=[];
 const zones=advanced?.sources.zones?.data?.zones as {key:string;label:string;attempts:number;made:number}[]|undefined;
 if(zones){const total=zones.reduce((n,z)=>n+z.attempts,0),top=[...zones].sort((a,b)=>b.attempts-a.attempts)[0];if(total>=30&&top?.attempts>=10)traits.push({kind:'zones',title:'Preferencia de tiro: '+top.label.toLowerCase(),evidence:`${fmt(top.attempts/total*100)}% de sus intentos · ${top.made}/${top.attempts} convertidos`});}
 const shots=advanced?.sources.shots?.data;
 if(shots?.totalAttempts>=30&&shots.dribbleAttempts>=20)traits.push({kind:'shots',title:'Tiro después de botar',evidence:`${fmt(shots.dribbleAttempts/shots.totalAttempts*100)}% de sus intentos · ${fmt(shots.dribbleMade/shots.dribbleAttempts*100)}% de acierto`});
 const passing=advanced?.sources.passes?.data;
 if(passing?.games>=5&&passing.passes>=50)traits.push({kind:'passes',title:'Distribución de balón',evidence:`${fmt(passing.passes/passing.games)} pases y ${fmt(passing.assists/passing.games)} asistencias por partido`});
 const defense=advanced?.sources.defense?.data;
 if(defense?.attempts>=30&&typeof defense.normalPct==='number')traits.push({kind:'defense',title:'Defensa del tiro',evidence:`${fmt(defense.made/defense.attempts*100)}% rival · ${fmt((defense.made/defense.attempts-defense.normalPct)*100)} puntos porcentuales frente a su acierto habitual`});
 if(played.length>=5){
  const avg=(m:'points'|'rebounds'|'assists'|'threes')=>analyze(played,m,0).average??0;
  const candidates=[{score:avg('points')/20,title:avg('points')>=20?'Volumen alto de anotación':'Aporte en anotación',m:'points' as const,unit:'puntos'},{score:avg('rebounds')/8,title:avg('rebounds')>=8?'Presencia en el rebote':'Participación en el rebote',m:'rebounds' as const,unit:'rebotes'},{score:avg('assists')/5,title:avg('assists')>=5?'Generación de asistencias':'Asistencias a compañeros',m:'assists' as const,unit:'asistencias'},{score:avg('threes')/2.5,title:avg('threes')>=2.5?'Anotación exterior frecuente':'Aporte desde el triple',m:'threes' as const,unit:'triples'}].sort((a,b)=>b.score-a.score);
  for(const c of candidates){if(traits.length>=4)break;traits.push({kind:'history',title:c.title,evidence:`${fmt(avg(c.m))} ${c.unit} por partido · ${played.length} partidos`});}
 }
 const points=analyze(played,'points',0).average,rebounds=analyze(played,'rebounds',0).average,assists=analyze(played,'assists',0).average;
 const attempts=played.reduce((n,g)=>n+(g.threeAttempts??0),0),made=played.filter(g=>g.threeAttempts!==undefined).reduce((n,g)=>n+g.threes,0);
 const description=played.length>=5?`${name} promedia ${fmt(points??0)} puntos, ${fmt(rebounds??0)} rebotes y ${fmt(assists??0)} asistencias en los ${played.length} partidos seleccionados.${attempts>=20?` En triples convierte el ${fmt(made/attempts*100)}% (${made}/${attempts}).`:''} ${traits[0]?.title??'Perfil estadístico'} es su rasgo más visible en esta muestra; no es una valoración global de su juego.`:`${name}: ${played.length} partidos disponibles en esta selección. La muestra todavía es insuficiente para describir características con respaldo estadístico.`;
 return {traits:traits.slice(0,4),description};
}
