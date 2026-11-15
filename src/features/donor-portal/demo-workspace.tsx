"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { demoRequests, demoRequestGifts } from "@/features/donation-requests/requests";
import { allocateDonations } from "@/features/donation-requests/allocation";
import { initialDemoProfile, type DemoProfile, type GiftDetails } from "./model";

function initialGiving() { return { requests: demoRequests, gifts: demoRequestGifts, allocations: allocateDonations(demoRequests, demoRequestGifts) }; }
type Giving = ReturnType<typeof initialGiving>;
interface DemoWorkspace {
  giving: Giving; setGiving: (value: Giving) => void;
  profiles: DemoProfile[]; setProfiles: (profiles: DemoProfile[]) => void;
  currentId: string | null; setCurrentId: (id: string | null) => void;
  giftDetails: GiftDetails[]; setGiftDetails: (details: GiftDetails[]) => void;
  registeredEmail: string; setRegisteredEmail: (email: string) => void;
}
const Context = createContext<DemoWorkspace | null>(null);
// UI-only state: no passwords, cookies, localStorage, server account or auth claim.
export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const [giving, setGiving] = useState(initialGiving);
  const [profiles, setProfiles] = useState<DemoProfile[]>([initialDemoProfile]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [giftDetails, setGiftDetails] = useState<GiftDetails[]>([]);
  const [registeredEmail, setRegisteredEmail] = useState("");
  return <Context.Provider value={{ giving, setGiving, profiles, setProfiles, currentId, setCurrentId, giftDetails, setGiftDetails, registeredEmail, setRegisteredEmail }}>{children}</Context.Provider>;
}
export function useOptionalDemoWorkspace() { return useContext(Context); }
export function useDemoWorkspace() {
  const value = useOptionalDemoWorkspace();
  if (!value) throw new Error("The donor demo is not available in live mode.");
  return value;
}
