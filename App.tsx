
import React, { useState, useEffect } from 'react';
import { 
  Users, LayoutDashboard, ShieldCheck, UserCheck, ArrowRight, Shield, Lock, AlertCircle,
  Menu, Calculator, X, Edit2, Save, Sparkles, Heart, Trash2, Database, History, Upload
} from 'lucide-react';
import { Member, Loan, Transaction, CommunicationLog, YearlyContribution, LoanApplication, AuditLog } from './types';
import { CONTRIBUTIONS_DB, INITIAL_MEMBERS, CONTRIBUTION_HISTORY_DB } from './constants';
import { callGemini } from './services/geminiService';
import { sheetService, isSheetsConfigured } from './services/sheetService';
import { authService, AuthUser } from './services/authService';
import { auditService } from './services/auditService';

// Components
import DashboardComponent from './components/DashboardComponent';
import MembersListComponent from './components/MembersListComponent';
import ContributionsComponent from './components/ContributionsComponent';
import LoansComponent from './components/LoansComponent';
import TransactionHistoryComponent from './components/TransactionHistoryComponent';
import ReportsComponent from './components/ReportsComponent';
import MemberPortal from './components/MemberPortal';
import Sidebar from './components/Sidebar';
import AuditLogViewer from './components/AuditLogViewer';
import FinancialProjections from './components/FinancialProjections';
import { MembersLoansExport } from './components/MembersLoansExport';

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

// Helper to generate next sequential Member ID (MC-XXXX)
const getNextMemberId = (currentMembers: Member[]) => {
  const ids = currentMembers
    .map(m => {
      const match = m.id.match(/^MC-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  const maxId = ids.length > 0 ? Math.max(...ids) : 1000;
  return `MC-${maxId + 1}`;
};

// Helper to convert any value to number, handling strings from Google Sheets
const toNumber = (val: any): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

// Deduplicate and normalize member data (handles Sheet/localStorage string values)
const normalizeMembers = (list: Member[]): Member[] => {
  const seen = new Set<string>();
  return list.reduce<Member[]>((acc, m) => {
    const id = (m.id || '').trim();
    if (!id || seen.has(id)) return acc;
    seen.add(id);
    acc.push({
      ...m,
      id,
      totalContribution: toNumber(m.totalContribution)
    });
    return acc;
  }, []);
};

// Normalize loans (convert all numeric fields from Sheets string values)
const normalizeLoans = (list: Loan[]): Loan[] => {
  return list.map(l => ({
    ...l,
    originalAmount: toNumber(l.originalAmount),
    remainingBalance: toNumber(l.remainingBalance),
    termMonths: toNumber(l.termMonths),
    interestRate: toNumber(l.interestRate),
    totalInterestAccrued: toNumber(l.totalInterestAccrued),
    missedPayments: toNumber(l.missedPayments),
    gracePeriodDays: toNumber(l.gracePeriodDays)
  }));
};

// Normalize transactions (convert amount field)
const normalizeTransactions = (list: Transaction[]): Transaction[] => {
  return list.map(t => ({
    ...t,
    amount: toNumber(t.amount)
  }));
};

// Normalize loan applications (convert amount and term fields)
const normalizeApplications = (list: LoanApplication[]): LoanApplication[] => {
  return list.map(app => ({
    ...app,
    amount: toNumber(app.amount),
    term: toNumber(app.term)
  }));
};

// --- Extracted Page Components ---

const LandingPage = ({ setViewMode }: { setViewMode: (mode: any) => void }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-50 dark:opacity-100">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
      </div>
      <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="inline-flex items-center justify-center p-4 bg-white dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10 mb-8 shadow-xl dark:shadow-2xl">
              <div className="p-3 bg-emerald-500 rounded-xl mr-4 text-white shadow-lg shadow-emerald-500/20"><Users size={32} /></div>
              <div className="text-left">
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Millionaires Club</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium tracking-wider uppercase">Financial Services</p>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] text-slate-500 dark:text-white/60 font-mono">v2.1</span>
                  </div>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div onClick={() => setViewMode('admin_login')} className="group bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10 text-left relative overflow-hidden">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><ShieldCheck size={24} /></div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Admin Workspace</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">Manage members, track loans, record contributions, and generate financial reports.</p>
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-sm group-hover:text-emerald-700 dark:group-hover:text-white transition-colors">Enter Workspace <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></div>
              </div>
              <div onClick={() => setViewMode('member_login')} className="group bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-blue-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 text-left relative overflow-hidden">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors"><UserCheck size={24} /></div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Member Portal</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">View your personal contribution history, check loan status, and download statements.</p>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm group-hover:text-blue-700 dark:group-hover:text-white transition-colors">Access Portal <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></div>
              </div>
          </div>
          <div className="mt-12 text-slate-400 dark:text-slate-500 text-xs">&copy; {new Date().getFullYear()} Millionaires Club Financial Services. All rights reserved.</div>
      </div>
  </div>
);

const AdminLoginPage = ({ onLogin, setViewMode, loginError, onShowReset, onShowVerify }: { onLogin: (e: React.FormEvent) => void, setViewMode: (mode: any) => void, loginError: string, onShowReset: () => void, onShowVerify: () => void }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
          <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full mb-4"><LayoutDashboard size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Workspace</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Secure access for fund managers.</p>
          </div>
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={16} />
              {loginError}
            </div>
          )}
          <form onSubmit={onLogin} className="space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input name="email" type="email" className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input name="password" type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Enter password" required />
                  </div>
              </div>
              <button type="submit" className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-2">Enter Workspace <ArrowRight size={16} /></button>
          </form>
          <div className="mt-4 text-center text-xs flex justify-center gap-4">
            <button onClick={onShowReset} className="text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</button>
            <span className="text-slate-400">•</span>
            <button onClick={onShowVerify} className="text-emerald-600 dark:text-emerald-400 hover:underline">Verify email</button>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center"><button onClick={() => setViewMode('landing')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">Back to Home</button></div>
      </div>
  </div>
);

const MemberLoginScreen = ({ onLogin, loginError, setViewMode }: { onLogin: (e: React.FormEvent) => void, loginError: string, setViewMode: (mode: any) => void }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
          <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-4"><Users size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Member Portal</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Access your fund records securely.</p>
          </div>
          {loginError && <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {loginError}</div>}
          <form onSubmit={onLogin} className="space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Member ID</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input name="memberId" placeholder="e.g. MC-1001" className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input name="password" type="password" placeholder="Enter password" className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required />
                  </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2">Access Portal <ArrowRight size={16} /></button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center"><button onClick={() => setViewMode('landing')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">Back to Home</button></div>
      </div>
  </div>
);

// --- System Tab Component with Health and Audit ---

const SystemTabComponent = ({ syncStatus, lastSyncTime, syncError, members, currentUser }: {
  syncStatus: 'idle' | 'syncing' | 'error',
  lastSyncTime: Date | null,
  syncError: string | null,
  members: Member[],
  currentUser: AuthUser | null
}) => {
  const [systemTab, setSystemTab] = useState<'health' | 'audit'>('health');

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setSystemTab('health')}
          className={`px-4 py-2 font-medium transition-colors ${
            systemTab === 'health'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} />
            System Health
          </div>
        </button>
        {currentUser && authService.hasRole('admin') && (
          <button
            onClick={() => setSystemTab('audit')}
            className={`px-4 py-2 font-medium transition-colors ${
              systemTab === 'audit'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={16} />
              Audit Trail
            </div>
          </button>
        )}
      </div>

      {/* Health Tab */}
      {systemTab === 'health' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">System Health</h3>
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
            <ShieldCheck size={16}/> All systems operational.
          </div>
          
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Data Sync Status</h4>
              {isSheetsConfigured() && (
                <button
                  onClick={async () => {
                    if (!confirm(`Sync ${members.length} members to Google Sheets? This will update all existing records.`)) return;
                    try {
                      let successCount = 0;
                      for (const member of members) {
                        await sheetService.upsertMember(member);
                        successCount++;
                      }
                      alert(`✅ Successfully synced ${successCount} members to Google Sheets!`);
                    } catch (error) {
                      alert(`❌ Sync failed: ${error}`);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Upload size={14} />
                  Bulk Sync Members
                </button>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database size={16} className={`${isSheetsConfigured() ? 'text-emerald-500' : 'text-slate-400'}`}/>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {isSheetsConfigured() ? "Google Sheets" : "Local Storage"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus === 'syncing' && <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>}
                {syncStatus === 'error' && <span className="text-xs text-red-600 dark:text-red-400">Sync Failed</span>}
                {syncStatus === 'idle' && isSheetsConfigured() && <span className="text-xs text-emerald-600 dark:text-emerald-400">Connected</span>}
                {!isSheetsConfigured() && <span className="text-xs text-slate-500">Offline</span>}
              </div>
            </div>
            {lastSyncTime && (
              <div className="text-xs text-slate-500">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
            {syncError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">Sync Error</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{syncError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {systemTab === 'audit' && currentUser && authService.hasRole('admin') && (
        <AuditLogViewer members={members} />
      )}
    </div>
  );
};

// --- Modals moved outside App to prevent re-renders ---

const MemberDetailPane = ({ editingMember, setEditingMember, handleAdminUpdateMember, handleAdminResetPassword, contributionHistory, setContributionHistory, setMembers, notify }: any) => {
    if (!editingMember) return null;
    const [detailTab, setDetailTab] = useState<'overview' | 'financial'>('overview');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingFinancials, setIsEditingFinancials] = useState(false);
    const [tempHistory, setTempHistory] = useState<YearlyContribution>({});
    const displayHistory = contributionHistory[editingMember.id] || {};

    const handleAnalyzeMember = async () => {
        setIsAnalyzing(true);
        const prompt = `Analyze: ${editingMember.name}, Joined: ${editingMember.joinDate}, Contrib: $${editingMember.totalContribution}. Status: ${editingMember.accountStatus}. Risk check (Max loan 4x contrib)?`;
        const result = await callGemini(prompt);
        setAiAnalysis(result);
        setIsAnalyzing(false);
    };

    const handleSaveFinancials = () => {
        const newTotal = Object.values(tempHistory).reduce((sum: number, val: number) => sum + val, 0);
        setContributionHistory((prev: any) => ({ ...prev, [editingMember.id]: tempHistory }));
        const updatedMember = { ...editingMember, totalContribution: newTotal };
        setMembers((prev: any) => prev.map((m: any) => m.id === editingMember.id ? updatedMember : m));
        setEditingMember(updatedMember);
        setIsEditingFinancials(false);
        notify('Financial history updated.');
    };

    return (
      <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                         <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {editingMember.name} 
                            <span className="text-sm font-normal text-slate-500">({editingMember.nickname || 'No Nickname'})</span>
                            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Edit2 size={16}/></button>
                         </h2>
                         <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{editingMember.id}</span>
                      </div>
                      <button onClick={() => setEditingMember(null)}><X size={20} className="text-slate-500 dark:text-slate-400"/></button>
                  </div>
                  {!isEditingProfile && (
                      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 text-sm font-medium">
                          <button onClick={() => setDetailTab('overview')} className={`pb-2 ${detailTab==='overview' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>Overview</button>
                          <button onClick={() => setDetailTab('financial')} className={`pb-2 ${detailTab==='financial' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>Financial</button>
                      </div>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isEditingProfile ? (
                      <form onSubmit={(e) => { handleAdminUpdateMember(e); setIsEditingProfile(false); }} className="space-y-4">
                          {/* Profile Photo Upload */}
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Profile Photo</label>
                              <div className="flex items-center gap-4">
                                  <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                                      {editingMember.photoUrl ? (
                                          <img src={editingMember.photoUrl} alt={editingMember.name} className="w-full h-full object-cover" />
                                      ) : (
                                          <Users size={40} className="text-slate-400" />
                                      )}
                                  </div>
                                  <div className="flex-1">
                                      <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (event) => {
                                                      const photoUrl = event.target?.result as string;
                                                      setEditingMember({ ...editingMember, photoUrl });
                                                  };
                                                  reader.readAsDataURL(file);
                                              }
                                          }}
                                          className="text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                                      />
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">JPG, PNG or GIF (max 2MB)</p>
                                  </div>
                              </div>
                              <input type="hidden" name="photoUrl" value={editingMember.photoUrl || ''} />
                          </div>
                          
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Name</label><input name="name" defaultValue={editingMember.name} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          
                          {/* Nickname moved above Email */}
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nickname</label><input name="nickname" defaultValue={editingMember.nickname} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email</label><input name="email" defaultValue={editingMember.email} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Phone</label><input name="phone" defaultValue={editingMember.phone} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Address</label><input name="address" defaultValue={editingMember.address} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">City</label><input name="city" defaultValue={editingMember.city || 'Tulsa'} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">State</label><input name="state" defaultValue={editingMember.state || 'OK'} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          </div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Zip Code</label><input name="zipCode" defaultValue={editingMember.zipCode || '74136'} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Beneficiary</label><input name="beneficiary" defaultValue={editingMember.beneficiary} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"/></div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Status</label>
                              <select name="accountStatus" defaultValue={editingMember.accountStatus} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                              </select>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              <button type="button" onClick={handleAdminResetPassword} className="text-xs text-red-500 hover:text-red-700 underline">Reset Password to Default</button>
                              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-700">Save Changes</button>
                          </div>
                      </form>
                  ) : detailTab === 'overview' ? (
                     <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                {/* Nickname moved above Email */}
                                <div className="col-span-2"><span className="text-xs text-slate-500 dark:text-slate-400 block">Nickname</span><span className="text-slate-800 dark:text-slate-200 flex items-center gap-1">{editingMember.nickname || '-'}</span></div>
                                
                                <div><span className="text-xs text-slate-500 dark:text-slate-400 block">Email</span><span className="text-slate-800 dark:text-slate-200">{editingMember.email || '-'}</span></div>
                                <div><span className="text-xs text-slate-500 dark:text-slate-400 block">Phone</span><span className="text-slate-800 dark:text-slate-200">{editingMember.phone || '-'}</span></div>
                                <div className="col-span-2"><span className="text-xs text-slate-500 dark:text-slate-400 block">Address</span><span className="text-slate-800 dark:text-slate-200">{editingMember.address || '-'}, {editingMember.city}, {editingMember.state} {editingMember.zipCode}</span></div>
                                
                                <div className="col-span-2"><span className="text-xs text-slate-500 dark:text-slate-400 block">Beneficiary</span><span className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><Heart size={12} className="text-red-400"/> {editingMember.beneficiary || '-'}</span></div>
                            </div>
                        </div>
                        <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-xl border border-indigo-100 dark:border-slate-600">
                           <div className="flex justify-between items-center mb-2">
                              <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><Sparkles size={16}/> AI Insight</h3>
                              <button onClick={handleAnalyzeMember} disabled={isAnalyzing} className="text-xs bg-white dark:bg-slate-600 dark:text-white border border-indigo-200 dark:border-slate-500 px-3 py-1 rounded hover:bg-indigo-100">{isAnalyzing ? 'Thinking...' : 'Analyze'}</button>
                           </div>
                           {aiAnalysis && <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{aiAnalysis}</p>}
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-6">
                         <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                             <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Total Accumulated</p>
                             <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(editingMember.totalContribution)}</p>
                         </div>
                         <div>
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="font-bold text-slate-800 dark:text-white">Yearly Breakdown</h3>
                                 {!isEditingFinancials ? (
                                     <button onClick={() => { setTempHistory({...displayHistory}); setIsEditingFinancials(true); }} className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                                         <Edit2 size={14} /> Edit History
                                     </button>
                                 ) : (
                                     <div className="flex gap-2">
                                         <button onClick={() => { setIsEditingFinancials(false); }} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">Cancel</button>
                                         <button onClick={handleSaveFinancials} className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg"><Save size={14} /> Save</button>
                                     </div>
                                 )}
                             </div>
                             <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                                         <tr><th className="px-4 py-3">Year</th><th className="px-4 py-3 text-right">Total</th>{isEditingFinancials && <th className="px-4 py-3 text-right w-10">Action</th>}</tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                         {(isEditingFinancials ? Object.keys(tempHistory) : Object.keys(displayHistory)).map(Number).sort((a,b)=>b-a).map(year => (
                                             <tr key={year} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                 <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{year}</td>
                                                 <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                                                     {isEditingFinancials ? <input type="number" className="w-24 p-1 text-right border rounded text-sm" value={tempHistory[year]} onChange={(e) => setTempHistory({...tempHistory, [year]: parseFloat(e.target.value) || 0})}/> : formatCurrency(isEditingFinancials ? tempHistory[year] : displayHistory[year])}
                                                 </td>
                                                 {isEditingFinancials && <td className="px-4 py-3 text-right"><button onClick={() => { const n = {...tempHistory}; delete n[year]; setTempHistory(n); }} className="text-red-400 p-1"><Trash2 size={16}/></button></td>}
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                     </div>
                  )}
              </div>
          </div>
      </div>
    );
};

const BatchUploadModal = ({ showBatchUpload, setShowBatchUpload, members, setMembers, notify }: any) => {
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string);
      };
      reader.readAsText(selectedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!csvText.trim()) {
      notify('Please paste CSV data or upload a file', 'error');
      return;
    }
    
    setUploading(true);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const newMembers: Member[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;
        
        const name = values[headers.indexOf('name')] || '';
        const email = values[headers.indexOf('email')] || '';
        const phone = values[headers.indexOf('phone')] || '';
        
        if (!name) {
          errors.push(`Row ${i + 1}: Name is required`);
          continue;
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${i + 1}: Invalid email`);
          continue;
        }
        
        const newId = getNextMemberId([...members, ...newMembers]);
        
        newMembers.push({
          id: newId,
          name,
          nickname: values[headers.indexOf('nickname')] || '',
          email,
          phone,
          address: values[headers.indexOf('address')] || '',
          city: values[headers.indexOf('city')] || 'Tulsa',
          state: values[headers.indexOf('state')] || 'OK',
          zipCode: values[headers.indexOf('zipcode')] || '74136',
          beneficiary: values[headers.indexOf('beneficiary')] || '',
          joinDate: new Date().toISOString().split('T')[0],
          accountStatus: 'Active',
          totalContribution: 0,
          activeLoanId: null,
          lastLoanPaidDate: null,
          password: 'welcome123'
        });
      }
      
      if (newMembers.length > 0) {
        setMembers([...members, ...newMembers]);
        
        if (isSheetsConfigured()) {
          for (const member of newMembers) {
            await sheetService.createMember(member).catch(err => console.error('Sheet sync error:', err));
          }
        }
        
        notify(`✓ Successfully imported ${newMembers.length} member(s)${errors.length > 0 ? ` (${errors.length} errors)` : ''}`, 'success');
      }
      
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }
      
      setShowBatchUpload(false);
      setCsvText('');
      setFile(null);
    } catch (err) {
      notify('Failed to parse CSV file', 'error');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  
  if (!showBatchUpload) return null;
  return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Batch Import Members (CSV)</h3>
              
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">CSV Format:</p>
                <p className="text-xs font-mono">name,email,phone,nickname,address,city,state,zipcode,beneficiary</p>
                <p className="text-xs mt-2">First row should be headers. Name is required.</p>
              </div>
              
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="mb-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
              />
              
              <textarea 
                className="w-full h-64 p-3 border rounded-lg text-xs font-mono dark:bg-slate-700 dark:text-white dark:border-slate-600" 
                placeholder="Or paste CSV data here..."
                value={csvText} 
                onChange={e => setCsvText(e.target.value)}
              />
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => { setShowBatchUpload(false); setCsvText(''); setFile(null); }} 
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload} 
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? 'Importing...' : 'Import Members'}
                </button>
              </div>
          </div>
      </div>
  );
};

const LoanCalculatorModal = ({ showCalculator, setShowCalculator }: any) => {
  if (!showCalculator) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [amount, setAmount] = useState(1000);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [term, setTerm] = useState(12);
  let fees = amount <= 2500 ? 30 : (term <= 12 ? 50 : 70);
  const monthly = amount / term;

  return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Calculator size={20} className="text-blue-500"/> Loan Calculator</h3><button onClick={() => setShowCalculator(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div>
              <div className="space-y-4">
                  <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amount ($)</label><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" max="5000"/><p className="text-[10px] text-slate-400 mt-1">Max: $5,000.00</p></div>
                  <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Term</label><select value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white mt-1"><option value={12}>12 Months</option><option value={24}>24 Months</option></select></div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl space-y-3 mt-2 border border-slate-100 dark:border-slate-600">
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Application Fee</span> <span className="font-bold text-slate-800 dark:text-white">${fees}</span></div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-3 font-bold text-lg text-emerald-600 dark:text-emerald-400"><span>Monthly Payment</span> <span>${monthly.toFixed(2)}</span></div>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'admin_login' | 'admin_dashboard' | 'member_login' | 'member_portal'>('landing');
  const [activeTab, setActiveTab] = useState('members');
  const [notifications, setNotifications] = useState<{id: number, message: string, type: 'success' | 'error' | 'info'}[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [currentMemberUser, setCurrentMemberUser] = useState<Member | null>(null);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [loginError, setLoginError] = useState('');
  const [adminEmails] = useState<string[]>([
    'admin@millionairesclub.com',
    'nang@example.com',   // MC-1001: Nangpi - President (also MC-1004: Sia Chit)
    'cin@example.com',    // MC-1002: Pu Tuang - Treasurer
    'mangpi@example.com', // MC-1070: Mangpi D. Jasuan - Board Member
    'thang@example.com'   // MC-1003: John Tuang - Board Member
  ]); // Board of Directors with admin access
  
  // Sync status tracking
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // -- Dark Mode State with Persistence --
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mpm_theme');
    return saved ? saved === 'dark' : true; // Default to dark if not set
  });

  // Toggle Dark Mode Class on Body/HTML and Save to LocalStorage
  useEffect(() => {
    if (isDarkMode) { 
      document.documentElement.classList.add('dark'); 
      localStorage.setItem('mpm_theme', 'dark');
    } else { 
      document.documentElement.classList.remove('dark'); 
      localStorage.setItem('mpm_theme', 'light');
    }
  }, [isDarkMode]);
  
  // -- Data State (TODO: Replace with API calls using services/api.ts) --
  // Initial loading from Google Sheets if configured
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('mpm_members');
    return normalizeMembers(saved ? JSON.parse(saved) : INITIAL_MEMBERS);
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('mpm_loans');
    return saved ? JSON.parse(saved) : [];
  });

  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>(() => {
    const saved = localStorage.getItem('mpm_loan_apps');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('mpm_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>(() => {
      const saved = localStorage.getItem('mpm_comms');
      return saved ? JSON.parse(saved) : [
          { id: 'c1', memberId: 'MC-1001', type: 'System', content: 'Renewal Reminder Sent (30 Days)', date: '2025-11-25T10:00:00', direction: 'Outbound' }
      ];
  });

  const [contributionHistory, setContributionHistory] = useState<Record<string, YearlyContribution>>(() => {
      const saved = localStorage.getItem('mpm_history');
      return saved ? JSON.parse(saved) : CONTRIBUTION_HISTORY_DB;
  });

  // --- GOOGLE SHEETS SYNC ON MOUNT ---
  useEffect(() => {
    const syncData = async () => {
      if (!isSheetsConfigured()) return;
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        const [m, l, t, a] = await Promise.all([
          sheetService.getMembers(),
          sheetService.getLoans(),
          sheetService.getTransactions(),
          sheetService.getApplications()
        ]);
        if(m.length) setMembers(normalizeMembers(m));
        if(l.length) setLoans(normalizeLoans(l));
        if(t.length) setTransactions(normalizeTransactions(t));
        if(a.length) setLoanApplications(normalizeApplications(a));
        setSyncStatus('idle');
        setLastSyncTime(new Date());
        notify("✓ Data synced with Google Sheets", "success");
      } catch (err) {
        console.error("Sheet sync failed", err);
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : 'Failed to sync with Google Sheets');
        notify("⚠️ Failed to sync with Google Sheets. Using local data.", "error");
      }
    };

    // Check for app updates (cache busting)
    const checkUpdates = async () => {
      try {
        const response = await fetch('/Millionaires-Club/version.txt', { cache: 'no-store' });
        const newVersion = await response.text();
        const oldVersion = localStorage.getItem('app_version');
        if (oldVersion && oldVersion !== newVersion) {
          console.log('App update detected. Clearing cache...');
          localStorage.clear();
          localStorage.setItem('app_version', newVersion);
          // Suggest refresh to user
          notify("✓ New version available! Please refresh the page.", "info");
        } else if (!oldVersion) {
          localStorage.setItem('app_version', newVersion);
        }
      } catch (err) {
        console.log('Update check skipped');
      }
    };

    checkUpdates();
    syncData();
  }, []);

  // -- Persistence & Sync Back --
  // Save to localStorage for fast local cache
  useEffect(() => { localStorage.setItem('mpm_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('mpm_loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem('mpm_loan_apps', JSON.stringify(loanApplications)); }, [loanApplications]);
  useEffect(() => { localStorage.setItem('mpm_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('mpm_comms', JSON.stringify(communicationLogs)); }, [communicationLogs]);
  useEffect(() => { localStorage.setItem('mpm_history', JSON.stringify(contributionHistory)); }, [contributionHistory]);

  // Sync to Google Sheets when data changes (with debounce to avoid spam)
  useEffect(() => {
    if (!isSheetsConfigured()) return;
    const timer = setTimeout(async () => {
      try {
        // Note: Google Sheets sync happens on individual operations (create/update)
        // This is just a fallback for any missed syncs
        console.log("Data cached locally and ready for Sheet operations");
      } catch (err) {
        console.error("Sheet sync error:", err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [members, loans, transactions, loanApplications]);

  // Sync currentMemberUser if admin updates data
  useEffect(() => {
    if (currentMemberUser) {
      const updated = members.find(m => m.id === currentMemberUser.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentMemberUser)) {
        setCurrentMemberUser(updated);
      }
    }
  }, [members, currentMemberUser]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 3000);
  };

  // -- Shared Logic (Calculator, Eligibility) --
  const calculateLoanLimit = (member: Member) => {
    const fourTimeContribution = member.totalContribution * 4;
    return Math.min(fourTimeContribution, 5000);
  };

  const checkEligibility = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { eligible: false, reason: 'Member not found' };
    if (member.accountStatus === 'Inactive') return { eligible: false, reason: 'Inactive account' };
    if (member.activeLoanId) return { eligible: false, reason: 'Active loan exists' };
    if (member.totalContribution <= 0) return { eligible: false, reason: 'No contributions' };
    const isActiveCosigner = loans.some(l => l.cosignerId === memberId && l.status === 'ACTIVE');
    if (isActiveCosigner) return { eligible: false, reason: 'Active cosigner on another loan' };
    if (member.lastLoanPaidDate) {
      const date1 = new Date(member.lastLoanPaidDate);
      const now = new Date();
      const monthsSincePaid = (now.getFullYear() - date1.getFullYear()) * 12 + (now.getMonth() - date1.getMonth());
      if (monthsSincePaid < 3) return { eligible: false, reason: `Cool-off (${3 - monthsSincePaid} mo. left)` };
    }
    return { eligible: true, limit: calculateLoanLimit(member) };
  };

  // -- CRUD Handlers --
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Auto-generate next sequential ID if not provided
    const formId = formData.get('mc_id') as string;
    const newId = formId || getNextMemberId(members);
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;

    // Validation
    if (!name || name.trim().length < 2) {
      notify('Please enter a valid name (at least 2 characters)', 'error');
      return;
    }
    
    if (members.some(m => m.id === newId)) {
      notify('Member ID already exists!', 'error');
      return;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify('Please enter a valid email address', 'error');
      return;
    }
    
    if (email && members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
      notify('Email already registered to another member', 'error');
      return;
    }
    
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      notify('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    const newMember: Member = {
      id: newId,
      name: name.trim(),
      nickname: (formData.get('nickname') as string)?.trim() || '',
      email: email.trim(),
      joinDate: new Date().toISOString().split('T')[0],
      accountStatus: 'Active',
      totalContribution: 0,
      activeLoanId: null,
      lastLoanPaidDate: null,
      phone: phone || '',
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || 'Tulsa',
      state: (formData.get('state') as string) || 'OK',
      zipCode: (formData.get('zipCode') as string) || '74136',
      beneficiary: (formData.get('beneficiary') as string) || '',
      password: 'welcome123' // Default password for new members
    };
    
    // Optimistic Update
    setMembers([...members, newMember]);
    notify(`Member ${newMember.name} added successfully with ID ${newId}!`);
    (e.target as HTMLFormElement).reset();

    // Audit log
    auditService.log('CREATE_MEMBER', 'member', newId, `Created member: ${newMember.name}`);

    // Async Google Sheet Update
    if (isSheetsConfigured()) {
        try {
            await sheetService.createMember(newMember);
        } catch (err) {
            console.error("Failed to save to sheet", err);
            notify("Saved locally, but Google Sheet update failed.", "error");
        }
    }
  };

  const handleDeleteMember = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    if (member.activeLoanId) { notify("Cannot delete member with an active loan.", "error"); return; }
    if (loans.some(l => l.cosignerId === id && l.status === 'ACTIVE')) { notify("Cannot delete member who is a cosigner on an active loan.", "error"); return; }
    if (window.confirm(`Are you sure you want to delete ${member.name}?`)) {
        setMembers(prev => prev.filter(m => m.id !== id));
        auditService.log('DELETE_MEMBER', 'member', id, `Deleted member: ${member.name}`);
        notify("Member deleted successfully.", "info");
        if (editingMember?.id === id) setEditingMember(null);

        if (isSheetsConfigured()) {
            await sheetService.deleteMember(id);
        }
    }
  };

  const handleAdminUpdateMember = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      if(!editingMember) return;
      
      const newStatus = formData.get('accountStatus') as 'Active' | 'Inactive';
      
      // Inactive Logic Check
      if (newStatus === 'Inactive' && editingMember.accountStatus === 'Active') {
          if (editingMember.activeLoanId) {
              notify("Cannot deactivate member with active loan.", "error");
              return;
          }
          if (loans.some(l => l.cosignerId === editingMember.id && l.status === 'ACTIVE')) {
             notify("Cannot deactivate member who is a cosigner.", "error");
             return;
          }

          if (window.confirm(`Deactivating ${editingMember.name} will distribute their total funds ($${editingMember.totalContribution}). Continue?`)) {
             // Create Distribution Transaction
             const distTransaction: Transaction = {
                 id: generateId(),
                 memberId: editingMember.id,
                 type: 'DISTRIBUTION',
                 amount: editingMember.totalContribution,
                 date: new Date().toISOString(),
                 description: 'Account Deactivation - Full Distribution',
                 status: 'completed'
             };
             setTransactions([distTransaction, ...transactions]);
             
             // Reset Contribution
             const finalUpdates = {
                 accountStatus: 'Inactive' as 'Inactive',
                 totalContribution: 0
             };
             
             const updated = { ...editingMember, ...finalUpdates };
             setMembers(members.map(m => m.id === editingMember.id ? updated : m));
             setEditingMember(updated);
             
             if (isSheetsConfigured()) {
                 await sheetService.createTransaction(distTransaction);
                 await sheetService.updateMember(updated);
             }

             notify(`Member deactivated. Funds distributed.`);
             return;
          } else {
             return;
          }
      }

      const updates = {
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          address: formData.get('address') as string,
          city: formData.get('city') as string,
          state: formData.get('state') as string,
          zipCode: formData.get('zipCode') as string,
          nickname: formData.get('nickname') as string,
          beneficiary: formData.get('beneficiary') as string,
          accountStatus: newStatus
      };

      const updatedMember = { ...editingMember, ...updates };
      setMembers(members.map(m => m.id === editingMember.id ? updatedMember : m));
      setEditingMember(updatedMember);
      
      // Track changes for audit log
      const changes = Object.keys(updates).filter(key => {
          const oldVal = (editingMember as any)[key];
          const newVal = (updates as any)[key];
          return oldVal !== newVal;
      }).map(field => ({
          field,
          oldValue: String((editingMember as any)[field] || ''),
          newValue: String((updates as any)[field] || '')
      }));
      
      // Log audit trail
        if (currentUser && changes.length > 0) {
          auditService.log(
          'UPDATE_MEMBER',
          'member',
          editingMember.id,
          `Updated member profile for ${editingMember.name}`,
          changes
          );
        }
      
      if (isSheetsConfigured()) {
          await sheetService.updateMember(updatedMember);
      }
      notify('Member profile updated.');
  };

  // --- Auth Handlers ---
  
  const handleMemberLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const memberId = (formData.get('memberId') as string).trim();
      const password = (formData.get('password') as string).trim();
      
      const member = members.find(m => m.id === memberId);
      
      if (!member) { setLoginError('Member ID not found.'); return; }
      
      if (member.accountStatus === 'Inactive') { 
          setLoginError('Account is Inactive. Please contact Admin.'); 
          return; 
      }
      
      if (member.password && member.password !== password) {
          setLoginError('Invalid Password. Default is welcome123');
          return;
      }
      
      // Create authentication token for member
      const authToken = authService.createToken(member, member.role || 'member');
      authService.storeToken(authToken);
      setCurrentUser(authToken.user);
      auditService.log('LOGIN', 'system', member.id, `${member.name} logged in to member portal`);
      
      setLoginError('');
      setCurrentMemberUser(member);
      setViewMode('member_portal');
      notify(`Welcome back, ${member.name}`);
  };

  const handleMemberUpdateProfile = async (updatedMember: Member) => {
      setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
      if (isSheetsConfigured()) {
          await sheetService.updateMember(updatedMember);
      }
      notify('Profile updated successfully.');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const email = ((formData.get('email') as string) || '').trim();
      const password = ((formData.get('password') as string) || '').trim();
      
      const authToken = authService.authenticate(email, password, members, adminEmails);
      
      if (authToken && (authToken.user.role === 'admin' || authToken.user.role === 'treasurer')) {
          authService.storeToken(authToken);
          setCurrentUser(authToken.user);
          auditService.log('LOGIN', 'system', authToken.user.id, `${authToken.user.name} logged in as ${authToken.user.role}`);
          notify(`Welcome, ${authToken.user.name}!`);
          setViewMode('admin_dashboard');
          setLoginError('');
      } else {
          setLoginError('Invalid credentials or insufficient permissions');
          notify('Invalid Admin Credentials.', 'error');
      }
  };

  const handleAdminResetPassword = async () => {
      if(!editingMember) return;
      if (window.confirm(`Reset password for ${editingMember.name} to 'welcome123'?`)) {
          const updated = { ...editingMember, password: 'welcome123' };
          setMembers(prev => prev.map(m => m.id === editingMember.id ? updated : m));
          setEditingMember(updated);
          if (isSheetsConfigured()) {
              await sheetService.updateMember(updated);
          }
          notify("Password reset to default.");
      }
  };

  const handleLogout = () => {
    if (currentUser) {
      auditService.log('LOGOUT', 'system', currentUser.id, `${currentUser.name} logged out`);
    }
    authService.clearAuth();
    setCurrentUser(null);
    setCurrentMemberUser(null);
    setViewMode('landing');
    notify('Logged out successfully');
  };

  // --- RENDER LOGIC ---
  if (viewMode === 'landing') return <LandingPage setViewMode={setViewMode} />;
  if (viewMode === 'admin_login') return <AdminLoginPage onLogin={handleAdminLogin} setViewMode={setViewMode} loginError={loginError} onShowReset={() => setShowResetModal(true)} onShowVerify={() => setShowVerifyModal(true)} />;
  if (viewMode === 'member_login') return <MemberLoginScreen onLogin={handleMemberLogin} loginError={loginError} setViewMode={setViewMode} />;
  
  if (viewMode === 'member_portal' && currentMemberUser) {
      const history = contributionHistory[currentMemberUser.id] || CONTRIBUTION_HISTORY_DB[currentMemberUser.id] || {};
      return (
        <MemberPortal 
            member={currentMemberUser} 
            members={members} 
            setMember={setCurrentMemberUser} 
            onUpdateProfile={handleMemberUpdateProfile} 
            loans={loans} 
            setLoans={setLoans} 
            transactions={transactions} 
            history={history} 
            loanApplications={loanApplications} 
            setLoanApplications={setLoanApplications} 
            onLogout={() => { setViewMode('landing'); setCurrentMemberUser(null); }} 
            notify={notify} 
        />
      );
  }
  
  const pendingLoanCount = loanApplications.filter(app => app.status === 'PENDING').length;

  return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white flex flex-col md:flex-row transition-colors duration-200">
          <div className="fixed top-6 right-6 z-[90] flex flex-col gap-3 pointer-events-none">
              {notifications.map(n => (<div key={n.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white text-sm font-medium ${n.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}>{n.message}</div>))}
          </div>

          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
            pendingLoanCount={pendingLoanCount} 
            isDarkMode={isDarkMode} 
            setIsDarkMode={setIsDarkMode} 
            setShowCalculator={setShowCalculator} 
            setViewMode={setViewMode}
            userType="admin"
          />

          <main className="flex-1 flex flex-col h-screen overflow-hidden">
              <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:hidden flex justify-between items-center">
                  <h1 className="font-bold text-slate-800 dark:text-white">Millionaires Club</h1>
                  <button onClick={() => setIsMobileMenuOpen(true)} className="dark:text-white"><Menu size={24}/></button>
              </header>

              <div className="flex-1 p-4 md:p-10 overflow-y-auto">
                  <header className="mb-6 hidden md:flex justify-between items-center">
                      <div>
                          <h2 className="text-3xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">{activeTab}</h2>
                          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your community portfolio efficiently.</p>
                      </div>
                      {currentUser && (
                          <div className="flex items-center gap-3">
                              <div className="text-right">
                                  <div className="text-sm font-medium text-slate-800 dark:text-white">{currentUser.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{currentUser.role}</div>
                              </div>
                              <button
                                  onClick={handleLogout}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                              >
                                  Logout
                              </button>
                          </div>
                      )}
                  </header>
                  
                  {activeTab === 'dashboard' && <DashboardComponent members={members} loans={loans} transactions={transactions} loanApplications={loanApplications} setActiveTab={setActiveTab} />}
                  {activeTab === 'members' && <MembersListComponent members={members} setEditingMember={setEditingMember} handleAddMember={handleAddMember} handleDeleteMember={handleDeleteMember} setShowBatchUpload={setShowBatchUpload} />}
                  {activeTab === 'contributions' && <ContributionsComponent members={members} setMembers={setMembers} transactions={transactions} setTransactions={setTransactions} notify={notify} />}
                  {activeTab === 'loans' && <LoansComponent members={members} setMembers={setMembers} loans={loans} setLoans={setLoans} transactions={transactions} setTransactions={setTransactions} notify={notify} checkEligibility={checkEligibility} loanApplications={loanApplications} setLoanApplications={setLoanApplications} />}
                  {activeTab === 'transactions' && <TransactionHistoryComponent members={members} transactions={transactions} />}
                  {activeTab === 'reports' && <ReportsComponent members={members} loans={loans} transactions={transactions} />}
                  {activeTab === 'projections' && <FinancialProjections members={members} loans={loans} transactions={transactions} />}
                  {activeTab === 'system' && (
                    <SystemTabComponent 
                      syncStatus={syncStatus}
                      lastSyncTime={lastSyncTime}
                      syncError={syncError}
                      members={members}
                      currentUser={currentUser}
                    />
                  )}
              </div>
          </main>
          
          <MemberDetailPane 
            editingMember={editingMember}
            setEditingMember={setEditingMember}
            handleAdminUpdateMember={handleAdminUpdateMember}
            handleAdminResetPassword={handleAdminResetPassword}
            contributionHistory={contributionHistory}
            setContributionHistory={setContributionHistory}
            setMembers={setMembers}
            notify={notify}
          />
          <BatchUploadModal showBatchUpload={showBatchUpload} setShowBatchUpload={setShowBatchUpload} members={members} setMembers={setMembers} notify={notify} />
          <LoanCalculatorModal showCalculator={showCalculator} setShowCalculator={setShowCalculator} />
          <PasswordResetModal 
            show={showResetModal} 
            onClose={() => setShowResetModal(false)} 
            members={members} 
            setMembers={setMembers} 
            notify={notify} 
          />
          <EmailVerificationModal 
            show={showVerifyModal} 
            onClose={() => setShowVerifyModal(false)} 
            notify={notify} 
          />
      </div>
  );
}

// --- Password Reset Modal ---
const PasswordResetModal = ({ show, onClose, members, setMembers, notify }: { show: boolean, onClose: () => void, members: Member[], setMembers: (fn: any) => void, notify: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleRequest = () => {
    if (!email) { notify('Please enter email', 'error'); return; }
    const code = authService.requestPasswordReset(email, members);
    if (!code) { notify('Email not found in members', 'error'); return; }
    setIssuedCode(code);
    setStep('verify');
    notify('Reset code generated (shown below).', 'info');
  };

  const handleVerify = async () => {
    if (!authService.verifyResetCode(email, code)) { notify('Invalid or expired code', 'error'); return; }
    if (!newPassword || newPassword.length < 6) { notify('Password must be at least 6 characters', 'error'); return; }
    const lower = email.toLowerCase();
    const member = members.find(m => (m.email || '').toLowerCase() === lower);
    if (!member) { notify('Member not found', 'error'); return; }
    const updated = { ...member, password: newPassword };
    setMembers((prev: Member[]) => prev.map(m => m.id === member.id ? updated : m));
    try { if (isSheetsConfigured()) await sheetService.updateMember(updated); } catch (e) { console.error(e); }
    authService.clearResetCode(email);
    notify('Password updated successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Reset Password</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        {step === 'request' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="you@example.com"/>
            </div>
            <button onClick={handleRequest} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Request Code</button>
            {issuedCode && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                <p className="text-xs text-slate-500">Your reset code:</p>
                <p className="text-lg font-bold tracking-widest">{issuedCode}</p>
                <p className="text-[10px] text-slate-400 mt-1">Code valid for 15 minutes.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Reset Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="6-digit code"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">New Password</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="At least 6 characters"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('request')} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Back</button>
              <button onClick={handleVerify} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Update Password</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Email Verification Modal ---
const EmailVerificationModal = ({ show, onClose, notify }: { show: boolean, onClose: () => void, notify: (msg: string, type?: 'success'|'error'|'info') => void }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  if (!show) return null;

  const handleRequest = () => {
    if (!email) { notify('Please enter email', 'error'); return; }
    const code = authService.requestVerification(email);
    setIssuedCode(code);
    notify('Verification code generated (shown below).', 'info');
  };

  const handleConfirm = () => {
    if (!authService.confirmVerification(email, code)) { notify('Invalid or expired code', 'error'); return; }
    notify('Email verified successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Verify Email</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="you@example.com"/>
          </div>
          <button onClick={handleRequest} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Request Code</button>
          {issuedCode && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              <p className="text-xs text-slate-500">Your verification code:</p>
              <p className="text-lg font-bold tracking-widest">{issuedCode}</p>
              <p className="text-[10px] text-slate-400 mt-1">Code valid for 30 minutes.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Verification Code</label>
            <input value={code} onChange={e => setCode(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="6-digit code"/>
          </div>
          <button onClick={handleConfirm} className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirm Verification</button>
        </div>
      </div>
    </div>
  );
};
