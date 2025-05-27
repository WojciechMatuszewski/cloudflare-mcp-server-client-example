import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Authenticate, Authorize, Login } from "./Auth";

const stytch = new StytchUIClient(import.meta.env.VITE_STYTCH_PUBLIC_TOKEN);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StytchProvider stytch={stytch}>
      <Router>
        <Routes>
          <Route path="/oauth/authorize" element={<Authorize />} />
          <Route path="/login" element={<Login />} />
          <Route path="/authenticate" element={<Authenticate />} />
        </Routes>
      </Router>
    </StytchProvider>
  </StrictMode>
);
