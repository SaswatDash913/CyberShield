import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cs_token"));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("cs_user")); } catch { return null; }
  });

  const login = (tok, usr) => {
    setToken(tok); setUser(usr);
    localStorage.setItem("cs_token", tok);
    localStorage.setItem("cs_user", JSON.stringify(usr));
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem("cs_token");
    localStorage.removeItem("cs_user");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
