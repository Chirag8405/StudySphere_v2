import React from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:pl-72">
        <div className="h-full overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
