import type {MarketLine} from './market-lines';
import type {Market} from './analytics';

export type AnalysisReference={kind:'automatic'|'custom'}|{kind:'market';book:string;price:number;updatedAt:string};
export type SelectedMarketLine=Extract<AnalysisReference,{kind:'market'}>&{playerId:string;market:Market;line:number;side:'over'|'under'};
export function offerIsCurrent(offer:Pick<MarketLine,'updatedAt'|'price'|'line'>,now:number,stale=false){
 const age=now-Date.parse(offer.updatedAt);
 return !stale&&Number.isFinite(age)&&age>=-5_000&&age<15*60_000&&Number.isFinite(offer.price)&&offer.price>1&&Number.isFinite(offer.line)&&offer.line>=0&&offer.line<=200;
}
export function analysisReference(origin:SelectedMarketLine|null,playerId:string,market:Market,line:number,side:'over'|'under',custom:boolean):AnalysisReference{
 return origin&&origin.playerId===playerId&&origin.market===market&&origin.line===line&&origin.side===side
  ?{kind:'market',book:origin.book,price:origin.price,updatedAt:origin.updatedAt}
  :{kind:custom?'custom':'automatic'};
}
export const referenceLabel=(reference:AnalysisReference)=>reference.kind==='market'?'Línea de '+reference.book:reference.kind==='custom'?'Línea manual':'Referencia estadística';
