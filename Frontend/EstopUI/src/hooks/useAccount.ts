import { useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Decoded JWT payload shape */
export interface JwtPayload {
  sub: string; // username
  userId: number;
  role: string;
  assignedStationId?: number;
  shift?: string;
  iat: number; // issued-at (epoch seconds)
  exp: number; // expiry (epoch seconds)
}

/** Values returned by useAccount */
export interface AccountInfo {
  /** Raw decoded JWT payload (null if no token) */
  payload: JwtPayload | null;
  /** Username from the token */
  username: string | null;
  /** User role */
  role: string | null;
  /** Full name from stored user data */
  fullName: string | null;
  /** User ID */
  userId: number | null;
  /** Assigned station ID */
  assignedStationId: number | null;
  /** Shift */
  shift: string | null;
  /** Token issued-at as Date */
  issuedAt: Date | null;
  /** Token expiry as Date */
  expiresAt: Date | null;
  /** Seconds remaining until expiry (0 if expired) */
  secondsRemaining: number;
  /** Whether the token is currently expired */
  isExpired: boolean;
  /** Whether the user is authenticated with a valid (non-expired) token */
  isAuthenticated: boolean;
  /** Force logout */
  logout: () => void;
}

/**
 * Decodes a JWT token's payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Custom hook that provides decoded user details from the JWT,
 * expiry information, and auto-redirects to /login when the token expires.
 */
export function useAccount(): AccountInfo {
  const { token, user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = payload ? Math.max(0, payload.exp - now) : 0;
  const isExpired = payload ? payload.exp <= now : !token ? false : true;

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Auto-redirect when token expires
  useEffect(() => {
    if (!token || !payload) return;

    // If already expired, redirect immediately
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      handleLogout();
      return;
    }

    // Set a timer to redirect when the token expires
    const msUntilExpiry = (payload.exp - Math.floor(Date.now() / 1000)) * 1000;
    const timer = setTimeout(() => {
      handleLogout();
    }, msUntilExpiry);

    return () => clearTimeout(timer);
  }, [token, payload, handleLogout]);

  return {
    payload,
    username: payload?.sub ?? user?.username ?? null,
    role: payload?.role ?? user?.role ?? null,
    fullName: user?.fullName ?? null,
    userId: payload?.userId ?? user?.userId ?? null,
    assignedStationId: payload?.assignedStationId ?? user?.assignedStationId ?? null,
    shift: payload?.shift ?? user?.shift ?? null,
    issuedAt: payload ? new Date(payload.iat * 1000) : null,
    expiresAt: payload ? new Date(payload.exp * 1000) : null,
    secondsRemaining,
    isExpired,
    isAuthenticated: isAuthenticated && !isExpired,
    logout: handleLogout,
  };
}
