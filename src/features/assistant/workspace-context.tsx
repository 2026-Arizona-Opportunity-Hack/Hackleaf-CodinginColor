"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Relationships } from "./contracts";
import { initialRelationships } from "./demo-state";

interface Workspace { relationships: Relationships; setRelationships: Dispatch<SetStateAction<Relationships>>; }
const Context = createContext<Workspace | null>(null);
export function AssistantWorkspaceProvider({ children }: { children: ReactNode }) {
  const [relationships, setRelationships] = useState(initialRelationships);
  return <Context.Provider value={{ relationships, setRelationships }}>{children}</Context.Provider>;
}
export function useAssistantWorkspace() { return useContext(Context); }
