import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { LoginResponse, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  token: string | null;
  user: LoginResponse | null;
}

interface AuthContextType extends AuthState {
  login: (data: LoginResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadState(): AuthState {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  return {
    token,
    user: raw ? (JSON.parse(raw) as LoginResponse) : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState);
  const navigate = useNavigate();
  const login = useCallback((data: LoginResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setState({ token: data.token, user: data });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ token: null, user: null });
    navigate('/login');
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!state.user) return false;
      return roles.includes(state.user.role as UserRole);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAuthenticated: !!state.token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
