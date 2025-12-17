
import { Member, Loan, Transaction, LoanApplication } from '../types';

// REPLACE THIS URL WITH YOUR DEPLOYED WEB APP URL
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxTm8LjrVJCfiXNPI3ddTSH7-fbAxmyGHBQZbUEA_BmZzgapvz7kErFq-Im3bi3QH0K/exec'; // Paste your Google Apps Script web app URL here 

// If URL is empty, the app uses local storage fallback
export const isSheetsConfigured = () => !!SHEET_API_URL;

const callScript = async (action: string, sheet: string, data?: any) => {
  if (!SHEET_API_URL) return null;

  // We use POST with text/plain to avoid CORS preflight complexity with Google Apps Script
  const response = await fetch(SHEET_API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, sheet, data }),
  });
  
  const json = await response.json();
  if (json.status === 'error') throw new Error(json.message);
  return json.data;
};

export const sheetService = {
  // --- Members ---
  getMembers: async (): Promise<Member[]> => {
    if (!isSheetsConfigured()) return [];
    return await callScript('read', 'Members');
  },
  createMember: async (member: Member) => {
    if (!isSheetsConfigured()) return;
    return await callScript('create', 'Members', member);
  },
  updateMember: async (member: Member) => {
    if (!isSheetsConfigured()) return;
    return await callScript('update', 'Members', member);
  },
  upsertMember: async (member: Member) => {
    if (!isSheetsConfigured()) return;
    const existing = await callScript('read', 'Members');
    const exists = Array.isArray(existing) && existing.some((row: any) => String(row.id) === String(member.id));
    if (exists) {
      return await callScript('update', 'Members', member);
    }
    return await callScript('create', 'Members', member);
  },
  deleteMember: async (id: string) => {
    if (!isSheetsConfigured()) return;
    return await callScript('delete', 'Members', { id });
  },

  // --- Loans ---
  getLoans: async (): Promise<Loan[]> => {
    if (!isSheetsConfigured()) return [];
    return await callScript('read', 'Loans');
  },
  createLoan: async (loan: Loan) => {
    if (!isSheetsConfigured()) return;
    return await callScript('create', 'Loans', loan);
  },
  updateLoan: async (loan: Loan) => {
    if (!isSheetsConfigured()) return;
    return await callScript('update', 'Loans', loan);
  },
  upsertLoan: async (loan: Loan) => {
    if (!isSheetsConfigured()) return;
    const existing = await callScript('read', 'Loans');
    const exists = Array.isArray(existing) && existing.some((row: any) => String(row.id) === String(loan.id));
    if (exists) {
      return await callScript('update', 'Loans', loan);
    }
    return await callScript('create', 'Loans', loan);
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    if (!isSheetsConfigured()) return [];
    return await callScript('read', 'Transactions');
  },
  createTransaction: async (transaction: Transaction) => {
    if (!isSheetsConfigured()) return;
    return await callScript('create', 'Transactions', transaction);
  },
  upsertTransaction: async (transaction: Transaction) => {
    if (!isSheetsConfigured()) return;
    const existing = await callScript('read', 'Transactions');
    const exists = Array.isArray(existing) && existing.some((row: any) => String(row.id) === String(transaction.id));
    if (exists) {
      return await callScript('update', 'Transactions', transaction);
    }
    return await callScript('create', 'Transactions', transaction);
  },

  // --- Applications ---
  getApplications: async (): Promise<LoanApplication[]> => {
    if (!isSheetsConfigured()) return [];
    return await callScript('read', 'Applications');
  },
  createApplication: async (app: LoanApplication) => {
    if (!isSheetsConfigured()) return;
    return await callScript('create', 'Applications', app);
  },
  updateApplication: async (app: LoanApplication) => {
    if (!isSheetsConfigured()) return;
    return await callScript('update', 'Applications', app);
  },
  upsertApplication: async (app: LoanApplication) => {
    if (!isSheetsConfigured()) return;
    const existing = await callScript('read', 'Applications');
    const exists = Array.isArray(existing) && existing.some((row: any) => String(row.id) === String(app.id));
    if (exists) {
      return await callScript('update', 'Applications', app);
    }
    return await callScript('create', 'Applications', app);
  }
};
