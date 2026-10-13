const fields={team:'team',venue:'venue',opponent:'opponent',minMinutes:'minutes',minGames:'games',minRate:'rate',minLine:'from',maxLine:'to',market:'stat',windowSize:'last',side:'side',sort:'sort'} as const;
type Filters=Record<keyof typeof fields,string|number>;
export function writeFilterUrl(q:URLSearchParams,filters:Filters,defaults:Filters){for(const [key,param] of Object.entries(fields)){const k=key as keyof Filters;if(filters[k]!==defaults[k])q.set(param,String(filters[k]));}}
export function readFilterUrl(q:URLSearchParams,defaults:Filters):unknown{
 let legacy:unknown=null;try{legacy=JSON.parse(q.get('filters')??'null');}catch{}
 const result:Record<string,unknown>={...defaults,...(legacy&&typeof legacy==='object'&&!Array.isArray(legacy)?legacy:{})};
 for(const [key,param] of Object.entries(fields))if(q.has(param))result[key]=typeof defaults[key as keyof Filters]==='number'?Number(q.get(param)):q.get(param);
 return result;
}
