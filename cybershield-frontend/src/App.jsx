import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import "./index.css";

function AppInner() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
