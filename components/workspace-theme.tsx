'use client';
import {ThemeProvider,useTheme} from 'next-themes';
import {useEffect,useState,type ReactNode} from 'react';
import {Moon,Sun} from 'lucide-react';
export function WorkspaceTheme({children,nonce}:{children:ReactNode;nonce?:string}){return <ThemeProvider attribute="data-theme" storageKey="playmetric:theme" defaultTheme="light" enableSystem={false} nonce={nonce}>{children}</ThemeProvider>;}
export function ThemeToggle(){const {theme,setTheme}=useTheme(),[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const dark=mounted&&theme==='dark';return <button className="theme-toggle" aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Modo claro':'Modo oscuro'} aria-pressed={dark} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;}
