import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import { LocalAuthProvider } from "./context/AuthContext.js";
import "./styles.css";

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

const content = (
  <BrowserRouter basename="/ibopemedia">
    <QueryClientProvider client={client}>
      <LocalAuthProvider>
        <App />
      </LocalAuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {content}
  </React.StrictMode>
);
