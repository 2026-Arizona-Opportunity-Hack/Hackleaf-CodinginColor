"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Relationships } from "./contracts";
import { initialRelationships } from "./demo-state";
import { scopeRelationships } from "@/features/donors/relationship-scope";

interface Workspace { relationships: Relationships; setRelationships: Dispatch<SetStateAction<Relationships>>; ownerScope:string|null; }
const Context = createContext<Workspace | null>(null);
export function AssistantWorkspaceProvider({ children,ownerScope=null }: { children: ReactNode;ownerScope?:string|null }) {
  const [relationships, setRelationships] = useState(initialRelationships);
  const visible=scopeRelationships(relationships,ownerScope);
  return <Context.Provider value={{ relationships:visible, setRelationships,ownerScope }}>{children}</Context.Provider>;
}
export function useAssistantWorkspace() { return useContext(Context); }
