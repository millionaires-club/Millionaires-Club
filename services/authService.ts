
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
    const member = members.find(m => 
      m.email.toLowerCase() === email.toLowerCase() && 
      m.password === password
    );
    
    if (!member) return null;
    
    // Determine role
    let role: 'admin' | 'treasurer' | 'member' = 'member';
    if (adminEmails.includes(email.toLowerCase())) {
      role = 'admin';
    }
    
    return authService.createToken(member, role);
  }
};
