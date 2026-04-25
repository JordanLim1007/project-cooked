import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background pb-24">
    {children}
    <BottomNav />
  </div>
);
