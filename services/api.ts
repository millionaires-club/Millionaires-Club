
import { Member, Loan, Transaction, LoanApplication } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const api = {
  auth: {
    login: async (credentials: any) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    me: async () => {
      const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
      return res.json();
    }
  },
  members: {
    getAll: async (): Promise<Member[]> => {
      const res = await fetch(`${API_URL}/members`, { headers: getHeaders() });
      return res.json();
    },
    create: async (member: Partial<Member>) => {
      const res = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(member),
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<Member>) => {
      const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      return res.json();
    }
  },
  loans: {
    getAll: async (): Promise<Loan[]> => {
      const res = await fetch(`${API_URL}/loans`, { headers: getHeaders() });
      return res.json();
    },
    create: async (loanData: any) => {
      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(loanData),
      });
      return res.json();
    }
  },
  transactions: {
    getAll: async (): Promise<Transaction[]> => {
      const res = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
      return res.json();
    },
    create: async (txData: any) => {
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(txData),
      });
      return res.json();
    }
  }
};
