"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type WorkspaceNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  sidebarId: string;
};

const WorkspaceNavContext = createContext<WorkspaceNavContextValue | null>(null);

type WorkspaceNavProviderProps = {
  sidebarId: string;
  children: ReactNode;
};

export function WorkspaceNavProvider({ sidebarId, children }: WorkspaceNavProviderProps) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, setOpen, sidebarId }),
    [open, sidebarId],
  );

  return (
    <WorkspaceNavContext.Provider value={value}>
      {children}
    </WorkspaceNavContext.Provider>
  );
}

export function useWorkspaceNav(): WorkspaceNavContextValue {
  const context = useContext(WorkspaceNavContext);
  if (!context) {
    throw new Error("useWorkspaceNav must be used within WorkspaceNavProvider");
  }
  return context;
}

export function useOptionalWorkspaceNav(): WorkspaceNavContextValue | null {
  return useContext(WorkspaceNavContext);
}
