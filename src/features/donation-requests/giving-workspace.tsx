"use client";
import { createContext,useContext,useState,type ReactNode } from "react";
import { demoRequests,demoRequestGifts } from "./requests";
import { allocateDonations } from "./allocation";
function initialGiving(){return {requests:demoRequests,gifts:demoRequestGifts,allocations:allocateDonations(demoRequests,demoRequestGifts)};}
type Giving=ReturnType<typeof initialGiving>;
const Context=createContext<{giving:Giving;setGiving:(value:Giving)=>void}|null>(null);
export function GivingWorkspaceProvider({children}:{children:ReactNode}){const [giving,setGiving]=useState(initialGiving);return <Context.Provider value={{giving,setGiving}}>{children}</Context.Provider>;}
export function useOptionalGivingWorkspace(){return useContext(Context);}
export function useGivingWorkspace(){const value=useOptionalGivingWorkspace();if(!value)throw new Error("Donation request demo state is unavailable.");return value;}
