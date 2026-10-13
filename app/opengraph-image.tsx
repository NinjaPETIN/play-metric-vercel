import {ImageResponse} from 'next/og';
export const alt='Play Metric — Entendé qué hay detrás de las estadísticas NBA';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:'65px',background:'#f1f5fc',color:'#142e54',fontFamily:'sans-serif'}}><div style={{display:'flex',fontSize:31,fontWeight:800}}>PLAY METRIC</div><div style={{display:'flex',marginTop:50,fontSize:69,fontWeight:800,maxWidth:950}}>Entendé qué hay detrás de los números.</div><div style={{display:'flex',marginTop:30,fontSize:28,color:'#536780'}}>Estadísticas NBA · Tendencias · Minutos · Contexto</div><div style={{display:'flex',marginTop:'auto',fontSize:24,color:'#3565ed'}}>Explorá una ficha gratis · En español</div></div>,size);}
