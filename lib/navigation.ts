export function safeReturnPath(path:string|null){
 if(!path||path.startsWith('//'))return '/?view=explore';
 return /^\/(?:\?(?:[^#]*)?|equipos\/[A-Z]{3}(?:\?[^#]*)?|partidos\/\d{10}(?:\?[^#]*)?)$/.test(path)?path:'/?view=explore';
}
