"use client";

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router";
import "./app.css";
import { OAuthCallback } from "./callback";
import { Chat } from "./chat";
import { Mcp } from "./mcp";

function App() {
  const [sessionId] = useState(() => {
    return crypto.randomUUID();
  });

  return (
    <main className={"max-w-xl m-auto flex flex-col gap-4 mt-4"}>
      <BrowserRouter>
        <nav role="tablist" className={"tabs tabs-lg m-auto"}>
          <TabLink to={"/chat"}>Chat</TabLink>
          <TabLink to={"/mcp"}>MCP settings</TabLink>
        </nav>
        <Routes>
          <Route path="/chat" element={<Chat sessionId={sessionId} />}></Route>
          <Route path="/mcp" element={<Mcp sessionId={sessionId} />}></Route>
          <Route path="/oauth/callback" element={<OAuthCallback />}></Route>
          <Route path="*" element={<Navigate to={"/chat"} />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
}

function TabLink({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <NavLink
      to={to}
      role="tab"
      className={({ isActive }) => {
        let baseClassName = "tab";
        if (isActive) {
          baseClassName += " tab-active";
        }
        return baseClassName;
      }}
    >
      {children}
    </NavLink>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(<App />);
