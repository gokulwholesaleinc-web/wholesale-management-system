import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import { Router } from "wouter";

// Initialize App with all providers
const AppWithProviders = () => {
  // Use standard browser routing for better user experience
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  );
};

// Don't register service worker in production until we have one ready
// This was causing issues with blank screen in deployment
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
*/

// Render the app
createRoot(document.getElementById("root")!).render(<AppWithProviders />);