"use client";
import { useEffect,useState } from "react";
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function InstallApp(){const [prompt,setPrompt]=useState<InstallEvent|null>(null);useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler);},[]);return prompt?<button onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null);}}>Install Hackleaf</button>:null;}
