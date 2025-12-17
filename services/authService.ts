
import { Member } from '../types';

const SECRET_KEY = 'millionaires-club-secret-2025'; // In production, use env variable
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'treasurer' | 'member';
  memberId?: string;
}

export interface AuthToken {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

// Simple JWT-like token (Base64 encoded for client-side only)
// For production, use proper JWT library and backend validation
export const authService = {
  // Create authentication token
  createToken: (member: Member, role: 'admin' | 'treasurer' | 'member'): AuthToken => {
    const user: AuthUser = {
      id: member.id,
      email: member.email,
      name: member.name,
      role,
      memberId: role === 'member' ? member.id : undefined
    };
    
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    const payload = {
      user,
      expiresAt,
      signature: btoa(JSON.stringify(user) + SECRET_KEY)
    };
    
    const token = btoa(JSON.stringify(payload));
    
    return { token, user, expiresAt };
  },

  // Verify and decode token
  verifyToken: (token: string): AuthUser | null => {
    try {
      const payload = JSON.parse(atob(token));
      
      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return null;
      }
      
      // Verify signature
      const expectedSignature = btoa(JSON.stringify(payload.user) + SECRET_KEY);
      if (payload.signature !== expectedSignature) {
        return null;
      }
      
      return payload.user;
    } catch (error) {
      return null;
    }
  },

  // --- Password Reset (client-side, code stored in localStorage) ---
  generateCode: (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  },

  requestPasswordReset: (email: string, members: Member[], expiresMinutes = 15): string | null => {
    const member = members.find(m => m.email?.toLowerCase() === email.toLowerCase());
    if (!member) return null;
    const code = authService.generateCode();
    const expiresAt = Date.now() + expiresMinutes * 60 * 1000;
    localStorage.setItem(`reset:${email.toLowerCase()}`, JSON.stringify({ code, expiresAt, memberId: member.id }));
    return code;
  },

  verifyResetCode: (email: string, code: string): boolean => {
    const raw = localStorage.getItem(`reset:${email.toLowerCase()}`);
    if (!raw) return false;
    try {
      const { code: saved, expiresAt } = JSON.parse(raw);
      if (Date.now() > expiresAt) return false;
      return saved === code;
    } catch {
      return false;
    }
  },

  clearResetCode: (email: string): void => {
    localStorage.removeItem(`reset:${email.toLowerCase()}`);
  },

  // --- Email Verification (client-side) ---
  requestVerification: (email: string, expiresMinutes = 30): string => {
    const code = authService.generateCode();
    const expiresAt = Date.now() + expiresMinutes * 60 * 1000;
    localStorage.setItem(`verify:${email.toLowerCase()}`, JSON.stringify({ code, expiresAt }));
    return code;
  },

  confirmVerification: (email: string, code: string): boolean => {
    const raw = localStorage.getItem(`verify:${email.toLowerCase()}`);
    if (!raw) return false;
    try {
      const { code: saved, expiresAt } = JSON.parse(raw);
      if (Date.now() > expiresAt) return false;
      const ok = saved === code;
      if (ok) {
        localStorage.setItem(`verified:${email.toLowerCase()}`, 'true');
        localStorage.removeItem(`verify:${email.toLowerCase()}`);
      }
      return ok;
    } catch {
      return false;
    }
  },

  isVerified: (email: string): boolean => {
    return localStorage.getItem(`verified:${email.toLowerCase()}`) === 'true';
  },

  // Store token in localStorage
  storeToken: (authToken: AuthToken): void => {
    localStorage.setItem('auth_token', authToken.token);
    localStorage.setItem('auth_user', JSON.stringify(authToken.user));
  },

  // Get stored token
  getStoredToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  // Get stored user
  getStoredUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Clear authentication
  clearAuth: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = authService.getStoredToken();
    if (!token) return false;
    return authService.verifyToken(token) !== null;
  },

  // Check if user has specific role
  hasRole: (requiredRole: 'admin' | 'treasurer' | 'member'): boolean => {
    const user = authService.getStoredUser();
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Treasurer has member permissions
    if (user.role === 'treasurer' && requiredRole === 'member') return true;
    
    return user.role === requiredRole;
  },

  // Authenticate member with email and password
  authenticate: (
    email: string,
    password: string,
    members: Member[],
    adminEmails: string[] = []
  ): AuthToken | null => {
    // First, locate the member by email regardless of password. Google Sheets
    // rows may omit the password field; we default to 'welcome123' in that case.
    const member = members.find(m => m.email?.toLowerCase() === email.toLowerCase());

    if (!member) return null;

    // If the member has no password set (e.g., synced from Sheets), accept the default.
    const expectedPassword = member.password || 'welcome123';
    if ((password || '').trim() !== expectedPassword) return null;

    // Determine role (admins are matched by email list)
    let role: 'admin' | 'treasurer' | 'member' = 'member';
    if (adminEmails.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
      role = 'admin';
    }

    return authService.createToken(member, role);
  }
};
