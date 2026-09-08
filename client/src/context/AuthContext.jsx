import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService, setAccessToken, clearAccessToken } from '../services';

const AuthContext = createContext(null);

const ROLE_DASHBOARD = {
  PATIENT: '/patient',
  DOCTOR: '/doctor',
  RECEPTIONIST: '/reception',
  PHARMACIST: '/pharmacy',
  ADMIN: '/admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback(({ user: u, accessToken }) => {
    setUser(u);
    setAccessToken(accessToken);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await authService.me();
        if (mounted) setUser(data.data.user);
      } catch (err) {
        // not logged in
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      mounted = false;
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  const login = useCallback(
    async (payload) => {
      const { data } = await authService.login(payload);
      applyAuth(data.data);
      return data.data;
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      /* ignore */
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const roleHome = useCallback(
    () => (user ? ROLE_DASHBOARD[user.role] || '/' : '/login'),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, roleHome }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
