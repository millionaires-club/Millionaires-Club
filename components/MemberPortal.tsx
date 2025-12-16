
import React, { useState, useRef } from 'react';
import { Member, Loan, Transaction, YearlyContribution, LoanApplication } from '../types';
import { 
  Users, LogOut, Wallet, Activity, CheckCircle, Clock, 
  TrendingUp, FileText, Settings, CreditCard, Upload, 
  User, Shield, Bell, ChevronRight, Download, Save, X, Edit2, AlertCircle, Menu, LayoutDashboard, ArrowRightLeft, Plus, Hourglass, XCircle, ExternalLink, Copy, Landmark, Lock, Loader, Check, Award, Calendar, Printer, PenTool, Heart
} from 'lucide-react';
import { sheetService, isSheetsConfigured } from '../services/sheetService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMemberTier, MemberTier } from '../constants';
import SignaturePad from './SignaturePad'; 

interface MemberPortalProps {
  member: Member;
  members: Member[];
  setMember: (member: Member) => void;
  onUpdateProfile: (updatedMember: Member) => void;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  transactions: Transaction[];
  history: YearlyContribution;
  loanApplications: LoanApplication[];
  setLoanApplications: React.Dispatch<React.SetStateAction<LoanApplication[]>>;
  onLogout: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MemberPortal: React.FC<MemberPortalProps> = ({ 
  member, members, setMember, onUpdateProfile, loans, setLoans, transactions, history, loanApplications, setLoanApplications, onLogout, notify
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'loans' | 'payments' | 'documents'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // -- Profile Edit State --
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});

  // -- Loan Application State --
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationForm, setApplicationForm] = useState({ amount: '', term: 12, purpose: '', cosignerId: '' });
  const [foundCosignerName, setFoundCosignerName] = useState('');

  // -- Payment Modals State --
  const [showZelleModal, setShowZelleModal] = useState(false);
  const [showACHModal, setShowACHModal] = useState(false);
  
  // -- ACH / QBO State --
  const [achForm, setAchForm] = useState({ routingNumber: '', accountNumber: '', accountName: '', accountType: 'Checking' });
  const [isProcessingACH, setIsProcessingACH] = useState(false);
  const [linkedBankAccount, setLinkedBankAccount] = useState<{bankName: string, last4: string} | null>(null);

  // -- Signing State --
  const [signingLoan, setSigningLoan] = useState<Loan | null>(null);
  
  // -- Schedule State --
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);
  
  // -- Agreement/Contract State --
  const [agreementLoan, setAgreementLoan] = useState<Loan | null>(null);

  // -- Derived Data --
  const tier = getMemberTier(member);
  const activeLoan = loans.find(l => l.id === member.activeLoanId);
  const memberTransactions = transactions
    .filter(t => t.memberId === member.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const myLoans = loans.filter(l => l.borrowerId === member.id).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  // Loans where member is cosigner
  const cosignerLoans = loans.filter(l => l.cosignerId === member.id).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  // Loans requiring cosigner signature (approved loans where member is cosigner and hasn't signed yet)
  const pendingCosignerSignatures = cosignerLoans.filter(l => 
    l.status === 'ACTIVE' && l.borrowerSignature && !l.cosignerSignature
  );
  
  const myApplications = loanApplications
    .filter(app => app.memberId === member.id)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Chart Data
  const chartData = transactions
    .filter(t => t.memberId === member.id && t.type === 'CONTRIBUTION')
    .slice(0, 12)
    .map(t => ({ date: new Date(t.date).toLocaleDateString(), amount: t.amount }));

  // -- Handlers --
  
  const handleCosignerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const id = e.target.value;
      setApplicationForm({ ...applicationForm, cosignerId: id });
      
      const found = members.find(m => m.id === id);
      if (found && found.id !== member.id && found.accountStatus === 'Active') {
          setFoundCosignerName(found.name);
      } else {
          setFoundCosignerName('');
      }
  };

  const handleEditClick = () => {
    setEditForm({
      email: member.email,
      phone: member.phone,
      address: member.address,
      city: member.city,
      state: member.state,
      zipCode: member.zipCode,
      nickname: member.nickname,
      beneficiary: member.beneficiary,
    });
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMember = { ...member, ...editForm };
    setMember(updatedMember);
    onUpdateProfile(updatedMember);
    setIsEditing(false);
  };

  const handleApplyLoan = (e: React.FormEvent) => {
      e.preventDefault();
      
      const amount = parseFloat(applicationForm.amount);
      if (isNaN(amount) || amount <= 0) {
          notify("Please enter a valid amount.", "error");
          return;
      }
      if (amount > 5000) {
          notify("Maximum loan amount is $5,000.", "error");
          return;
      }
      if (!applicationForm.cosignerId || !foundCosignerName) {
          notify("Please provide a valid Cosigner ID.", "error");
          return;
      }

      const hasPending = myApplications.some(app => app.status === 'PENDING');
      if (hasPending) {
          notify("You already have a pending application.", "error");
          return;
      }

      const newApplication: LoanApplication = {
          id: Math.random().toString(36).substr(2, 9),
          memberId: member.id,
          amount,
          term: applicationForm.term,
          purpose: applicationForm.purpose,
          proposedCosignerId: applicationForm.cosignerId,
          date: new Date().toISOString(),
          status: 'PENDING'
      };

      setLoanApplications([newApplication, ...loanApplications]);
      
      // Sync to Google Sheets
      if (isSheetsConfigured()) {
          sheetService.createApplication(newApplication).catch(err => console.error('Sheet sync error:', err));
      }
      
      notify("Loan application submitted successfully!");
      setShowApplyModal(false);
      setApplicationForm({ amount: '', term: 12, purpose: '', cosignerId: '' });
      setFoundCosignerName('');
  };

  const handleLinkACH = (e: React.FormEvent) => {
      e.preventDefault();
      if (achForm.routingNumber.length !== 9) {
          notify("Routing number must be 9 digits.", "error");
          return;
      }
      if (achForm.accountNumber.length < 4) {
          notify("Please enter a valid account number.", "error");
          return;
      }
      setIsProcessingACH(true);
      setTimeout(() => {
          setIsProcessingACH(false);
          setLinkedBankAccount({
              bankName: 'Chase Bank',
              last4: achForm.accountNumber.slice(-4)
          });
          setShowACHModal(false);
          notify("Bank account securely linked via QuickBooks!");
          setAchForm({ routingNumber: '', accountNumber: '', accountName: '', accountType: 'Checking' });
      }, 2000);
  };

  const toggleAutoPay = () => {
    const updated = { ...member, autoPay: !member.autoPay };
    setMember(updated);
    onUpdateProfile(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify("Copied to clipboard!");
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTierBadgeStyles = (tier: MemberTier) => {
      switch(tier) {
          case 'Diamond': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700';
          case 'Platinum': return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
          case 'Gold': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700';
          case 'Silver': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
          case 'Bronze': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(id as any); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-medium'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );

  // --- LOAN SCHEDULE GENERATOR ---
  const generateLoanSchedule = (loan: Loan) => {
    const startDate = new Date(loan.startDate);
    const monthlyPayment = loan.originalAmount / loan.termMonths;
    const schedule = [];
    const repayments = transactions
        .filter(t => t.type === 'LOAN_REPAYMENT' && t.memberId === loan.borrowerId && new Date(t.date) > new Date(loan.startDate))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let totalPaid = 0;

    for (let i = 1; i <= loan.termMonths; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 10);
        const payment = repayments[i-1];
        const actualAmount = payment ? payment.amount : null;
        if (actualAmount) totalPaid += actualAmount;

        schedule.push({
            number: i,
            dueDate: dueDate,
            estimated: monthlyPayment,
            actual: actualAmount,
            actualDate: payment ? new Date(payment.date) : null
        });
    }
    return { schedule, totalPaid };
  };

  const LoanAgreementModal = () => {
      if (!agreementLoan) return null;
      
      const borrower = members.find(m => m.id === agreementLoan.borrowerId);
      const cosigner = members.find(m => m.id === agreementLoan.cosignerId);
      const monthlyPayment = agreementLoan.originalAmount / agreementLoan.termMonths;
      const issueDate = new Date(agreementLoan.startDate);
      const firstPaymentDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(issueDate.getTime() + agreementLoan.termMonths * 30 * 24 * 60 * 60 * 1000);
      const authorizedSigner = agreementLoan.issuedBy || 'Board of Directors';
      
      const handlePrint = () => {
          const win = window.open('', '', 'width=210mm,height=297mm');
          if (!win) return;
          
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Loan Agreement - ${agreementLoan.id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
                <style>
                  @page { size: A4; margin: 0; }
                  body {
                    font-family: 'Inter', sans-serif;
                    margin: 0; padding: 10mm; width: 190mm; margin: 0 auto;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    box-sizing: border-box; color: #1e293b;
                  }
                  .page-container {
                    position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
                    border: 2px solid #C00000; padding: 5px; box-sizing: border-box;
                    display: flex; flex-direction: column;
                  }
                  .inner-border {
                    border: 1px solid #4472C4; height: 100%; padding: 20px 30px;
                    box-sizing: border-box; position: relative; display: flex; flex-direction: column;
                  }
                  .watermark {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 80pt; color: rgba(200, 200, 200, 0.08); font-weight: 900;
                    white-space: nowrap; z-index: 0; pointer-events: none;
                  }
                  .content { position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column; }
                  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
                  .brand-main { font-family: 'Playfair Display', serif; font-size: 22pt; color: #8B0000; margin: 0; line-height: 1; }
                  .brand-sub { font-size: 8pt; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
                  .email { font-size: 8pt; color: #94a3b8; margin-top: 3px; }
                  .title { text-align: center; font-size: 16pt; font-weight: 700; margin: 15px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
                  .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 9pt; font-weight: 600; }
                  .section { margin-bottom: 12px; font-size: 9pt; line-height: 1.5; }
                  .section-title { font-weight: 700; margin-bottom: 6px; color: #0f172a; font-size: 10pt; }
                  .body-text { margin-bottom: 6px; color: #475569; }
                  ul { margin: 6px 0; padding-left: 20px; }
                  li { margin-bottom: 4px; color: #475569; }
                  .signatures { margin-top: 20px; }
                  .sig-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 9pt; }
                  .sig-label { font-weight: 600; width: 80px; }
                  .sig-line { flex: 1; border-bottom: 1px solid #94a3b8; min-height: 40px; display: flex; align-items: flex-end; padding-bottom: 2px; }
                  .sig-line img { max-height: 40px; }
                  .sig-date { border-bottom: 1px solid #94a3b8; width: 120px; padding: 2px 4px; }
                  .footer { margin-top: auto; text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                  .no-print { display: none; }
                </style>
              </head>
              <body>
                  <div class="page-container">
                    <div class="inner-border">
                        <div class="watermark">MILLIONAIRES CLUB</div>
                        <div class="content">
                            <div class="header">
                                <h1 class="brand-main">Millionaires Club</h1>
                                <div class="brand-sub">Financial Services</div>
                                <div class="email">info.millionairesclubusa@gmail.com</div>
                            </div>

                            <div class="title">LOAN AGREEMENT</div>

                            <div class="info-row">
                                <div>Date: ${issueDate.toLocaleDateString()}</div>
                                <div>Principal Amount: $${agreementLoan.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                            </div>

                            <div class="section">
                                <div class="section-title">1. THE PARTIES</div>
                                <div><strong>Lender:</strong> Millionaires Club (represented by ${authorizedSigner})</div>
                                <div style="margin-top:4px;"><strong>Borrower:</strong> ${borrower?.name} (Residing at ${borrower?.address || 'Tulsa, OK'})</div>
                                <div style="margin-top:4px;"><strong>Co-Signer:</strong> ${cosigner?.name}</div>
                            </div>

                            <div class="section">
                                <div class="section-title">2. REPAYMENT TERMS</div>
                                <div class="body-text">For value received, the Borrower and Co-Signer promise to pay the Lender the Principal Amount according to the following schedule:</div>
                                <ul>
                                    <li><strong>Installments:</strong> Monthly payments of <strong>$${monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong> beginning on <strong>${firstPaymentDate.toLocaleDateString()}</strong> and continuing until <strong>${endDate.toLocaleDateString()}</strong>.</li>
                                    <li><strong>Prepayment:</strong> The Borrower may pay off the loan early without penalty.</li>
                                    <li><strong>Late Fee:</strong> If a payment is more than 15 days late, a late fee of <strong>$25.00</strong> shall be added to that payment.</li>
                                </ul>
                            </div>

                            <div class="section">
                                <div class="section-title">3. DEFAULT AND REMEDIES (STRICT ENFORCEMENT)</div>
                                <div class="body-text">To protect the Lender, the Borrower and Co-Signer agree to the following:</div>
                                <ul>
                                    <li><strong>Acceleration (Immediate Repayment):</strong> If the Borrower fails to make a payment within 30 days of the due date, the Lender has the right to declare the entire remaining balance immediately due and payable.</li>
                                    <li><strong>Collection Costs:</strong> In the event of non-payment, the Borrower and Co-Signer agree to pay all legal fees, court costs, and collection agency fees incurred by the Lender to recover the debt.</li>
                                    <li><strong>Co-Signer Liability:</strong> The Co-Signer guarantees payment of this note. The Co-Signer is jointly and severally liable, meaning the Lender may collect the full amount from the Co-Signer immediately upon default without first suing the Borrower.</li>
                                </ul>
                            </div>

                            <div class="section">
                                <div class="section-title">4. GOVERNING LAW</div>
                                <div class="body-text">This agreement is governed by the laws of the State of Oklahoma.</div>
                            </div>

                            <div class="section-title" style="margin-top:20px; text-align:center; border:none;">SIGNATURES</div>
                            
                            <div class="signatures">
                                <!-- Borrower -->
                                <div class="sig-row">
                                    <span class="sig-label">Borrower:</span>
                                    <div class="sig-line">${agreementLoan.borrowerSignature ? `<img src="${agreementLoan.borrowerSignature}" style="max-height:40px;" />` : ''}</div>
                                    <span class="sig-label" style="width:auto;">Date:</span>
                                    <div class="sig-date">${agreementLoan.signedDate ? new Date(agreementLoan.signedDate).toLocaleDateString() : ''}</div>
                                </div>
                                <div style="margin-top:-20px; margin-bottom:20px; font-size:9pt;">(${borrower?.name})</div>

                                <!-- Cosigner -->
                                <div class="sig-row">
                                    <span class="sig-label">Co-Signer:</span>
                                    <div class="sig-line">${agreementLoan.cosignerSignature ? `<img src="${agreementLoan.cosignerSignature}" style="max-height:40px;" />` : ''}</div>
                                    <span class="sig-label" style="width:auto;">Date:</span>
                                    <div class="sig-date">${agreementLoan.cosignerSignedDate ? new Date(agreementLoan.cosignerSignedDate).toLocaleDateString() : ''}</div>
                                </div>
                                <div style="margin-top:-20px; margin-bottom:20px; font-size:9pt;">(${cosigner?.name})</div>

                                <!-- Lender -->
                                <div class="sig-row">
                                    <span class="sig-label">Lender:</span>
                                    <div class="sig-line">${authorizedSigner}</div>
                                    <span class="sig-label" style="width:auto;">Date:</span>
                                    <div class="sig-date">${issueDate.toLocaleDateString()}</div>
                                </div>
                                <div style="margin-top:-20px; font-size:9pt;">(${authorizedSigner}, Authorized Board Member)</div>
                            </div>
                        </div>

                        <div class="footer">
                            <div>&copy; 2025 Millionaires Club Board of Directors • Official Document</div>
                        </div>
                    </div>
                  </div>
                  <div class="no-print" style="position:fixed; top:20px; right:20px; display:block;">
                      <button onclick="window.print()" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">PRINT</button>
                  </div>
              </body>
            </html>
          `);
          win.document.close();
      };

      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-xl text-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Loan Agreement</h3>
                    <p className="text-sm text-slate-500 mb-6">Official contract for {borrower?.name}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setAgreementLoan(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300">Close</button>
                        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"><Printer size={18}/> Print Agreement</button>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const LoanScheduleModal = () => {
      if (!scheduleLoan) return null;
      const borrower = members.find(m => m.id === scheduleLoan.borrowerId);
      const cosigner = members.find(m => m.id === scheduleLoan.cosignerId);
      const { schedule, totalPaid } = generateLoanSchedule(scheduleLoan);
      
      const paymentNumber = schedule.filter(s => s.actual).length;
      const progressPercent = (totalPaid / scheduleLoan.originalAmount) * 100;
      
      const handlePrint = () => {
          const win = window.open('', '', 'width=210mm,height=297mm');
          if (!win) return;
          
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Loan Payment Schedule</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
                <style>
                  @page { size: A4; margin: 0; }
                  body {
                    font-family: 'Inter', sans-serif;
                    margin: 0; padding: 10mm; width: 190mm; margin: 0 auto;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    box-sizing: border-box; color: #1e293b;
                  }
                  .page-container {
                    position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
                    border: 2px solid #C00000; padding: 5px; box-sizing: border-box;
                    display: flex; flex-direction: column;
                  }
                  .inner-border {
                    border: 1px solid #4472C4; height: 100%; padding: 20px 30px;
                    box-sizing: border-box; position: relative; display: flex; flex-direction: column;
                  }
                  .watermark {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 80pt; color: rgba(200, 200, 200, 0.08); font-weight: 900;
                    white-space: nowrap; z-index: 0; pointer-events: none;
                  }
                  .content { position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column; }
                  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
                  .brand-main { font-family: 'Playfair Display', serif; font-size: 20pt; color: #8B0000; margin: 0; line-height: 1; }
                  .brand-sub { font-size: 8pt; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px; }
                  .doc-title { text-align: right; }
                  .doc-type { font-size: 14pt; font-weight: 700; color: #0f172a; text-transform: uppercase; }
                  .doc-id { font-family: monospace; color: #94a3b8; font-size: 9pt; }
                  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
                  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
                  .stat-label { font-size: 7pt; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
                  .stat-value { font-size: 11pt; font-weight: 700; color: #0f172a; }
                  .text-emerald { color: #059669; } .text-blue { color: #2563eb; }
                  .progress-section { margin-bottom: 20px; }
                  .progress-container { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 5px; }
                  .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); width: ${progressPercent}%; }
                  .progress-labels { display: flex; justify-content: space-between; font-size: 8pt; color: #64748b; }
                  .info-section { display: flex; gap: 30px; margin-bottom: 20px; font-size: 9pt; }
                  .info-col { flex: 1; }
                  .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 6px 0; }
                  .info-label { color: #64748b; font-weight: 500; } .info-val { font-weight: 600; }
                  .schedule-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                  .schedule-table th { text-align: left; padding: 8px 6px; background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px; }
                  .schedule-table td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
                  .schedule-table tr:last-child td { border-bottom: 2px solid #0f172a; }
                  .num-col { color: #94a3b8; font-weight: 600; width: 40px; }
                  .amount-col { font-family: monospace; font-weight: 600; }
                  .status-pill { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; min-width: 50px; text-align: center; }
                  .status-paid { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
                  .status-pending { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
                  .status-due { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
                  .footer { margin-top: auto; text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                  .no-print { display: none; }
                </style>
              </head>
              <body>
                  <div class="page-container">
                    <div class="inner-border">
                        <div class="watermark">MILLIONAIRES CLUB</div>
                        <div class="content">
                            <div class="header">
                                <div><h1 class="brand-main">Millionaires Club</h1><div class="brand-sub">Financial Services</div></div>
                                <div class="doc-title"><div class="doc-type">Repayment Schedule</div><div class="doc-id">LOAN #${scheduleLoan.id}</div></div>
                            </div>
                            <div class="stats-grid">
                                <div class="stat-card"><div class="stat-label">Principal</div><div class="stat-value">$${scheduleLoan.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                                <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value text-emerald">$${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                                <div class="stat-card"><div class="stat-label">Balance</div><div class="stat-value text-blue">$${(scheduleLoan.originalAmount - totalPaid).toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                                <div class="stat-card"><div class="stat-label">Term</div><div class="stat-value">${scheduleLoan.termMonths} Mo</div></div>
                            </div>
                            <div class="progress-section">
                                <div class="progress-container"><div class="progress-bar-fill"></div></div>
                                <div class="progress-labels"><span>Start</span><span>${progressPercent.toFixed(1)}% Complete</span><span>Finish</span></div>
                            </div>
                            <div class="info-section">
                                <div class="info-col">
                                    <div class="info-row"><span class="info-label">Borrower</span><span class="info-val">${borrower?.name}</span></div>
                                    <div class="info-row"><span class="info-label">Member ID</span><span class="info-val">${borrower?.id}</span></div>
                                </div>
                                <div class="info-col">
                                    <div class="info-row"><span class="info-label">Issued</span><span class="info-val">${new Date(scheduleLoan.startDate).toLocaleDateString()}</span></div>
                                    <div class="info-row"><span class="info-label">Status</span><span class="info-val" style="text-transform:uppercase;">${scheduleLoan.status}</span></div>
                                </div>
                            </div>
                            <div style="flex:1; overflow:hidden;">
                                <table class="schedule-table">
                                    <thead><tr><th style="width: 30px;">#</th><th>Due Date</th><th style="text-align:right;">Est. Payment</th><th style="text-align:right;">Actual Paid</th><th style="text-align:right;">Paid Date</th><th style="text-align:center;">Status</th></tr></thead>
                                    <tbody>
                                        ${schedule.map((row, idx) => {
                                            let statusClass = 'status-pending'; let statusText = 'Pending';
                                            if (row.actual) { statusClass = 'status-paid'; statusText = 'PAID'; } else if (new Date() > row.dueDate) { statusClass = 'status-due'; statusText = 'OVERDUE'; }
                                            return `<tr><td class="num-col">${row.number}</td><td>${row.dueDate.toLocaleDateString()}</td><td class="amount-col" style="text-align:right;">$${row.estimated.toFixed(2)}</td><td class="amount-col" style="text-align:right; color:${row.actual ? '#059669' : '#94a3b8'};">${row.actual ? '$' + row.actual.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</td><td style="text-align:right; font-size:8pt; color:#64748b;">${row.actualDate ? row.actualDate.toLocaleDateString() : ''}</td><td style="text-align:center;"><span class="status-pill ${statusClass}">${statusText}</span></td></tr>`
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="footer">&copy; 2025 Millionaires Club Board of Directors • Official Document<br>Generated on ${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                  </div>
                  <div class="no-print" style="position:fixed; top:20px; right:20px; display:block;">
                      <button onclick="window.print()" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">PRINT</button>
                  </div>
              </body>
            </html>
          `);
          win.document.close();
      };

      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-xl text-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Loan Payment Schedule</h3>
                    <p className="text-sm text-slate-500 mb-6">Ready to print for {borrower?.name}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setScheduleLoan(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300">Close</button>
                        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"><Printer size={18}/> Print Modern Schedule</button>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const ZellePaymentModal = () => {
      if (!showZelleModal) return null;
      return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><CreditCard size={20} className="text-purple-600"/> Zelle Payment</h3>
                      <button onClick={() => setShowZelleModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"/></button>
                  </div>
                  <div className="text-center space-y-4">
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-100 dark:border-purple-800">
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Send payment to:</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-white select-all">pay@millionairesclub.com</p>
                          <p className="text-xs text-slate-400 mt-1">or <strong>(918) 555-0123</strong></p>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Please include your Member ID <strong>({member.id})</strong> in the memo.</p>
                      <button onClick={() => { copyToClipboard("pay@millionairesclub.com"); }} className="w-full py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"><Copy size={16}/> Copy Email</button>
                      <button onClick={() => setShowZelleModal(false)} className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700">Done</button>
                  </div>
              </div>
          </div>
      );
  };

  const ACHSetupModal = () => {
      if (!showACHModal) return null;
      return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Landmark size={20} className="text-blue-600"/> Link Bank Account</h3>
                      <button onClick={() => setShowACHModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"/></button>
                  </div>
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-blue-800"><Shield size={20} className="text-blue-600 shrink-0 mt-0.5"/><p className="text-xs text-blue-800 dark:text-blue-200">We use <strong>QuickBooks Intuit</strong> to securely link your bank account. Your credentials are never stored on our servers.</p></div>
                  <form onSubmit={handleLinkACH} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Account Holder Name</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="e.g. John Doe" value={achForm.accountName} onChange={e => setAchForm({...achForm, accountName: e.target.value})} required /></div>
                      <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Routing Number</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="9 Digits" maxLength={9} value={achForm.routingNumber} onChange={e => setAchForm({...achForm, routingNumber: e.target.value})} required /></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Account Type</label><select className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={achForm.accountType} onChange={e => setAchForm({...achForm, accountType: e.target.value})}><option value="Checking">Checking</option><option value="Savings">Savings</option></select></div></div>
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Account Number</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Account Number" value={achForm.accountNumber} onChange={e => setAchForm({...achForm, accountNumber: e.target.value})} required /></div>
                      <button type="submit" disabled={isProcessingACH} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 mt-2">{isProcessingACH ? <Loader size={18} className="animate-spin"/> : <Lock size={18}/>}{isProcessingACH ? 'Linking with Bank...' : 'Link Account Securely'}</button>
                  </form>
              </div>
          </div>
      );
  };

  const handleSigningComplete = (signatureData: string) => {
      if (!signingLoan) return;
      const updatedLoan: Loan = { ...signingLoan, borrowerSignature: signatureData, signedDate: new Date().toISOString() };
      setLoans(prevLoans => prevLoans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
      notify("Agreement signed successfully!");
      setSigningLoan(null);
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white overflow-hidden transition-colors">
      <ZellePaymentModal />
      <ACHSetupModal />
      <LoanAgreementModal />
      <LoanScheduleModal />
      
      {signingLoan && (
          <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center"><h2 className="font-bold text-lg">Sign Loan Agreement</h2><button onClick={() => setSigningLoan(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X/></button></div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900 flex justify-center">
                  <div className="w-full max-w-3xl bg-white shadow-xl p-12 min-h-[800px] text-slate-900 relative">
                        <h1 className="text-2xl font-bold text-center mb-8 uppercase text-red-800" style={{fontFamily: 'Times New Roman'}}>Loan Agreement Contract</h1>
                        <p className="mb-4"><strong>Borrower:</strong> {member.name}</p>
                        <p className="mb-4"><strong>Loan Amount:</strong> ${signingLoan.originalAmount.toLocaleString()}</p>
                        <p className="mb-8">By signing below, I acknowledge and agree to the terms of this loan.</p>
                        <div className="mt-12 border-t-2 border-slate-200 pt-8">
                            <label className="block font-bold mb-2">Sign Below:</label>
                            <SignaturePad onSave={handleSigningComplete} onCancel={() => setSigningLoan(null)} />
                        </div>
                  </div>
              </div>
          </div>
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 text-slate-400 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col h-[100dvh]`}>
          <div className="p-8 flex justify-between items-center shrink-0">
              <h1 className="text-xl font-bold text-white flex items-center gap-3"><div className="p-1.5 bg-emerald-500 rounded-lg text-white"><Users size={20} /></div>Millionaires Club</h1>
              <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
          </div>
          <div className="px-8 pb-4 shrink-0"><div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Portal</div><p className="text-sm text-slate-300">Member Access</p></div>
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem id="profile" icon={User} label="My Profile" />
              <NavItem id="loans" icon={ArrowRightLeft} label="My Loans" />
              <NavItem id="payments" icon={CreditCard} label="Payments" />
              <NavItem id="documents" icon={FileText} label="Documents" />
          </nav>
          <div className="p-6 border-t border-slate-800 space-y-4 mt-auto shrink-0">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-xs font-bold transition-colors"><LogOut size={14}/> Sign Out</button>
              <div className="flex items-center gap-3 text-sm bg-slate-800/50 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">{member.name.charAt(0)}</div>
                  <div className="overflow-hidden">
                      <p className="text-white font-medium truncate">{member.name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border mt-1 ${getTierBadgeStyles(tier)}`}>{tier === 'Diamond' && <Award size={8} />} {tier}</span>
                  </div>
              </div>
          </div>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
         <header className="bg-slate-900 border-b border-slate-800 p-4 md:hidden flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2"><div className="p-1 bg-emerald-500 rounded text-white"><Users size={16} /></div><span className="font-bold text-white">Millionaires Club</span></div>
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300"><Menu size={24}/></button>
         </header>
         <header className="hidden md:flex justify-between items-center p-8 pb-0 shrink-0">
            <div><h2 className="text-3xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">{activeTab.replace('loans', 'Loan History')}</h2><p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {member.name.split(' ')[0]}.</p></div>
            <div className="flex items-center gap-4"><button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors relative"><Bell size={20} /><span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span></button></div>
         </header>
         <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-20">
             {activeTab === 'dashboard' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                             <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={100} /></div>
                             <h3 className="font-bold text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase tracking-wider">Total Contribution</h3>
                             <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(member.totalContribution)}</p>
                         </div>
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                             <h3 className="font-bold text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase tracking-wider">Active Loan</h3>
                             {activeLoan ? (<div><p className="text-4xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">{formatCurrency(activeLoan.remainingBalance)}</p><div className="mt-4 flex justify-between items-center"><div className="text-sm text-slate-500 dark:text-slate-400">Next Due: <span className="font-bold text-slate-800 dark:text-white">{formatDate(activeLoan.nextPaymentDue)}</span></div><button onClick={() => setActiveTab('payments')} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50">Pay Now</button></div></div>) : (<div><p className="text-4xl font-bold text-slate-300 dark:text-slate-600 tracking-tight">$0.00</p><p className="text-sm text-slate-400 mt-4">No active loans. You are eligible to apply.</p></div>)}
                         </div>
                         <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden border border-slate-700/50">
                             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                             <h3 className="font-bold text-slate-400 text-xs mb-1 uppercase tracking-wider">Membership Tier</h3>
                             <div className="flex items-center gap-3 mt-2"><div className={`p-2 rounded-full border ${getTierBadgeStyles(tier)} bg-opacity-20 border-opacity-30`}><Award size={24} /></div><div><p className="text-2xl font-bold">{tier} Member</p><p className="text-xs text-slate-400">Member since {new Date(member.joinDate).getFullYear()}</p></div></div>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400"/> Fund Growth</h3>
                             <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData.length > 0 ? chartData : [{date: 'No Data', amount: 0}]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1}/>
                                    <XAxis dataKey="date" hide />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`}/>
                                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => [`$${value}`, 'Contribution']}/>
                                    <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                                  </BarChart>
                                </ResponsiveContainer>
                             </div>
                         </div>
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                             <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Clock size={20} className="text-blue-600 dark:text-blue-400"/> Recent Activity</h3>
                             <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                 {memberTransactions.length > 0 ? memberTransactions.slice(0, 5).map(t => (
                                     <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                                         <div className={`p-2 rounded-lg shrink-0 ${t.type === 'CONTRIBUTION' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>{t.type === 'CONTRIBUTION' ? <Wallet size={16}/> : <Activity size={16}/>}</div>
                                         <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{t.type.replace('_', ' ')}</p><p className="text-xs text-slate-400">{formatDate(t.date)}</p></div>
                                         <span className={`text-sm font-bold whitespace-nowrap ${t.type.includes('REPAYMENT') || t.type === 'CONTRIBUTION' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.type.includes('REPAYMENT') || t.type === 'CONTRIBUTION' ? '+' : ''}{formatCurrency(t.amount)}</span>
                                     </div>
                                 )) : <div className="text-center py-8 text-slate-400 text-sm">No recent activity.</div>}
                             </div>
                             <button onClick={() => setActiveTab('payments')} className="mt-4 w-full py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">View Full History <ChevronRight size={14}/></button>
                         </div>
                     </div>
                 </div>
             )}
             {activeTab === 'loans' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><FileText size={20} className="text-slate-600 dark:text-slate-400"/> Loan Applications</h3><button onClick={() => setShowApplyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"><Plus size={16}/> Apply for Loan</button></div>
                        <div className="overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Cosigner ID</th><th className="px-4 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{myApplications.map(app => (<tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30"><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(app.date)}</td><td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{formatCurrency(app.amount)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-400">{app.term} Months</td><td className="px-4 py-3 text-slate-600 dark:text-slate-400">{app.proposedCosignerId}</td><td className="px-4 py-3 text-right"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${app.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : app.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'}`}>{app.status === 'PENDING' && <Hourglass size={12}/>}{app.status === 'APPROVED' && <CheckCircle size={12}/>}{app.status === 'REJECTED' && <XCircle size={12}/>}{app.status}</span></td></tr>))}</tbody></table></div>
                    </div>
                    
                    {/* Cosigner Signature Requests */}
                    {pendingCosignerSignatures.length > 0 && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl shadow-sm border-2 border-amber-200 dark:border-amber-700 p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                                    <AlertCircle size={24} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-1">
                                        <PenTool size={18} />
                                        Signature Required ({pendingCosignerSignatures.length})
                                    </h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        You are listed as a cosigner on the following loans. Please review and sign the loan agreements.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {pendingCosignerSignatures.map(loan => {
                                    const borrower = members.find(m => m.id === loan.borrowerId);
                                    return (
                                        <div key={loan.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-700/50 flex items-center justify-between gap-4 shadow-sm">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                        {loan.id}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                                                        Borrower: {borrower?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(loan.originalAmount)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{loan.termMonths} months</span>
                                                    <span>•</span>
                                                    <span>Issued: {new Date(loan.startDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSigningLoan(loan)}
                                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-amber-200 dark:shadow-none"
                                            >
                                                <PenTool size={16} />
                                                Sign Now
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><ArrowRightLeft size={20} className="text-blue-600 dark:text-blue-400"/> Loan History</h3><div className="text-sm text-slate-500 dark:text-slate-400">Total Borrowed: <span className="font-bold text-slate-800 dark:text-white">${myLoans.reduce((sum, l) => sum + l.originalAmount, 0).toLocaleString()}</span></div></div>
                        <div className="overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700"><tr><th className="px-4 py-3">Loan ID</th><th className="px-4 py-3">Date Issued</th><th className="px-4 py-3">Term</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-right">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{myLoans.map(loan => (<tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30"><td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{loan.id}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(loan.startDate).toLocaleDateString()}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{loan.termMonths} Months</td><td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">${loan.originalAmount.toLocaleString()}</td><td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">${loan.remainingBalance.toLocaleString()}</td><td className="px-4 py-3 text-right"><span className={`text-xs font-bold px-2 py-1 rounded border ${loan.status === 'ACTIVE' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' : loan.status === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800'}`}>{loan.status}</span></td><td className="px-4 py-3 text-right flex gap-2 justify-end">{loan.status === 'ACTIVE' && (<><button onClick={() => setSigningLoan(loan)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400" title="Sign Agreement"><PenTool size={16}/></button><button onClick={() => setAgreementLoan(loan)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="View Agreement"><FileText size={16}/></button><button onClick={() => setScheduleLoan(loan)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400" title="View Schedule"><Calendar size={16}/></button></>)}{loan.status === 'PAID' && (<><button onClick={() => setAgreementLoan(loan)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="View Agreement"><FileText size={16}/></button><button onClick={() => setScheduleLoan(loan)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400" title="View Schedule"><Calendar size={16}/></button></>)}</td></tr>))}</tbody></table></div>
                    </div>
                </div>
             )}
             {activeTab === 'profile' && (
                 <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                         <div className="bg-slate-50 dark:bg-slate-700/50 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                             <div><h2 className="text-xl font-bold text-slate-800 dark:text-white">Personal Information</h2><p className="text-sm text-slate-500 dark:text-slate-400">Manage your contact details.</p></div>
                             {!isEditing ? (
                                 <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"><Edit2 size={16}/> Edit Profile</button>
                             ) : (
                                 <div className="flex gap-2">
                                     <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
                                     <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200 dark:shadow-none"><Save size={16}/> Save Changes</button>
                                 </div>
                             )}
                         </div>
                         <div className="p-8">
                             {isEditing ? (
                                 <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email Address</label><input type="email" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})}/></div>
                                     <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Phone Number</label><input type="tel" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.phone || ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})}/></div>
                                     <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Street Address</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})}/></div>
                                     <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">City</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.city || ''} onChange={(e) => setEditForm({...editForm, city: e.target.value})}/></div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">State</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.state || ''} onChange={(e) => setEditForm({...editForm, state: e.target.value})}/></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Zip Code</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.zipCode || ''} onChange={(e) => setEditForm({...editForm, zipCode: e.target.value})}/></div>
                                     </div>
                                     <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nickname</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.nickname || ''} onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}/></div>
                                     <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Beneficiary Name</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.beneficiary || ''} onChange={(e) => setEditForm({...editForm, beneficiary: e.target.value})}/></div>
                                 </form>
                             ) : (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                     <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                         <p className="text-lg font-medium text-slate-800 dark:text-white mt-1">{member.name}</p>
                                         <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-0.5">"{member.nickname || 'No Nickname'}"</p>
                                     </div>
                                     <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Member ID</label><p className="text-lg font-medium text-slate-800 dark:text-white mt-1 font-mono">{member.id}</p></div>
                                     <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label><p className="text-lg font-medium text-slate-800 dark:text-white mt-1">{member.email}</p></div>
                                     <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label><p className="text-lg font-medium text-slate-800 dark:text-white mt-1">{member.phone || 'Not provided'}</p></div>
                                     <div className="md:col-span-2">
                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mailing Address</label>
                                         <p className="text-lg font-medium text-slate-800 dark:text-white mt-1">{member.address || 'Street not provided'}</p>
                                         <p className="text-base text-slate-600 dark:text-slate-300">{member.city || 'City'}, {member.state || 'State'} {member.zipCode || 'Zip'}</p>
                                     </div>
                                     <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 flex items-start gap-4">
                                         <div className="p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm text-red-400"><Heart size={20} /></div>
                                         <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beneficiary</label><p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{member.beneficiary || 'None Designated'}</p></div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                     <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center"><div><h3 className="font-bold text-slate-800 dark:text-white">Security Settings</h3><p className="text-sm text-slate-500 dark:text-slate-400">Update password and 2FA settings.</p></div><button className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Manage</button></div>
                 </div>
             )}
             {/* Payments and Documents content... */}
         </div>
      </main>

      {/* Loan Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={24} className="text-blue-600 dark:text-blue-400"/>
                Apply for Loan
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24}/>
              </button>
            </div>

            <form onSubmit={handleApplyLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Loan Amount</label>
                <input
                  type="number"
                  value={applicationForm.amount}
                  onChange={(e) => setApplicationForm({ ...applicationForm, amount: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter amount (max $5,000)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Term</label>
                <select
                  value={applicationForm.term}
                  onChange={(e) => setApplicationForm({ ...applicationForm, term: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Purpose</label>
                <textarea
                  value={applicationForm.purpose}
                  onChange={(e) => setApplicationForm({ ...applicationForm, purpose: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Reason for loan..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cosigner ID</label>
                <input
                  type="text"
                  value={applicationForm.cosignerId}
                  onChange={handleCosignerIdChange}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. MC-1002"
                  required
                />
                {foundCosignerName && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={16}/>
                    <span>Found: {foundCosignerName}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signingLoan && (
        <SignaturePad
          loan={signingLoan}
          onClose={() => setSigningLoan(null)}
          onSave={(signature) => {
            // Determine if member is signing as borrower or cosigner
            const isBorrower = signingLoan.borrowerId === member.id;
            const isCosigner = signingLoan.cosignerId === member.id;
            
            let updatedLoan = { ...signingLoan };
            
            if (isBorrower) {
              updatedLoan.borrowerSignature = signature;
              if (!updatedLoan.signedDate) {
                updatedLoan.signedDate = new Date().toISOString();
              }
            } else if (isCosigner) {
              updatedLoan.cosignerSignature = signature;
              if (!updatedLoan.cosignerSignedDate) {
                updatedLoan.cosignerSignedDate = new Date().toISOString();
              }
            }
            
            setLoans(loans.map(l => l.id === signingLoan.id ? updatedLoan : l));
            
            if (isSheetsConfigured()) {
              sheetService.updateLoan(updatedLoan).catch(err => console.error('Sheet sync error:', err));
            }
            
            const role = isBorrower ? 'borrower' : 'cosigner';
            notify(`Loan agreement signed successfully as ${role}!`);
            setSigningLoan(null);
          }}
        />
      )}

      {/* Loan Schedule Modal */}
      <LoanScheduleModal />

    </div>
  );
};

export default MemberPortal;
