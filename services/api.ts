
import { Member, Loan, Transaction, LoanApplication } from '../types';
import { sheetService } from './sheetService';

// Using Google Sheets as the data source via Google Apps Script
export const api = {
  auth: {
    login: async (credentials: any) => {
      // For GitHub Pages + Google Sheets, use simple localStorage-based auth
      const users = await sheetService.getMembers();
      const user = users.find((u: any) => u.email === credentials.email);
      if (!user) throw new Error('User not found');
      
      // Store basic auth info
      localStorage.setItem('token', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, user };
    },
    me: async () => {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) throw new Error('Not authenticated');
      return JSON.parse(currentUser);
    }
  },
  members: {
    getAll: async (): Promise<Member[]> => {
      return await sheetService.getMembers();
    },
    create: async (member: Partial<Member>) => {
      return await sheetService.createMember(member as Member);
    },
    update: async (id: string, updates: Partial<Member>) => {
      const members = await sheetService.getMembers();
      const member = members.find(m => m.id === id);
      if (!member) throw new Error('Member not found');
      const updated = { ...member, ...updates };
      return await sheetService.updateMember(updated);
    }
  },
  loans: {
    getAll: async (): Promise<Loan[]> => {
      return await sheetService.getLoans();
    },
    create: async (loanData: any) => {
      return await sheetService.createLoan(loanData);
    }
  },
  transactions: {
    getAll: async (): Promise<Transaction[]> => {
      return await sheetService.getTransactions();
    },
    create: async (txData: any) => {
      return await sheetService.createTransaction(txData);
    }
  }
};
