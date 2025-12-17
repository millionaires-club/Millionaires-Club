
import React, { useState, useRef, useEffect } from 'react';
import { Member, Loan, Transaction, LoanApplication } from '../types';
import { AlertCircle, CheckCircle, CreditCard, X, DollarSign, Clock, Calendar, Printer, History, Search, ChevronDown, Check, UserPlus, AlertTriangle, FileText, Wallet, FileSignature, Hourglass } from 'lucide-react';
import { sheetService, isSheetsConfigured } from '../services/sheetService';
import { financialService } from '../services/financialService';

interface LoansProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  checkEligibility: (id: string) => { eligible: boolean; reason?: string; limit?: number };
  loanApplications: LoanApplication[];
  setLoanApplications: React.Dispatch<React.SetStateAction<LoanApplication[]>>;
}

const LoansComponent: React.FC<LoansProps> = ({ members, setMembers, loans, setLoans, transactions, setTransactions, notify, checkEligibility, loanApplications, setLoanApplications }) => {
  const [borrowerId, setBorrowerId] = useState('');
  const [cosignerId, setCosignerId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [term, setTerm] = useState(12);
  const [feeType, setFeeType] = useState<'upfront' | 'capitalized'>('upfront');
  
  // Financial Features
  const [interestRate, setInterestRate] = useState(0);
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple');
  const [enableAutopay, setEnableAutopay] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  
  // Track if we are processing a specific application
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);
  
  // Disbursal Details
  const [disbursalMethod, setDisbursalMethod] = useState('Check');
  const [issuedBy, setIssuedBy] = useState('Nangpi');

  // Searchable Dropdown State for Borrower
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Searchable Dropdown State for Cosigner
  const [cosignerSearch, setCosignerSearch] = useState('');
  const [isCosignerDropdownOpen, setIsCosignerDropdownOpen] = useState(false);
  const cosignerDropdownRef = useRef<HTMLDivElement>(null);

  // Repayment Modal State
  const [repaymentLoan, setRepaymentLoan] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  // New Repayment Fields
  const [repayMethod, setRepayMethod] = useState('Cash');
  const [repayReceivedBy, setRepayReceivedBy] = useState('Nangpi');

  // Schedule Modal State
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);

  // Filter and Search State
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAID' | 'DEFAULTED'>('ALL');

  const eligibility = borrowerId ? checkEligibility(borrowerId) : null;
  const recentRepayments = transactions.filter(t => t.type === 'LOAN_REPAYMENT').slice(0, 5);
  
  const pendingApplications = loanApplications.filter(app => app.status === 'PENDING');
  
  const filteredLoans = loans.filter(loan => {
    const borrower = members.find(m => m.id === loan.borrowerId);
    const cosigner = members.find(m => m.id === loan.cosignerId);
    const matchesSearch = loanSearchTerm === '' || 
      borrower?.name.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
      cosigner?.name.toLowerCase().includes(loanSearchTerm.toLowerCase()) ||
      loan.id.toLowerCase().includes(loanSearchTerm.toLowerCase());
    
    const matchesStatus = loanStatusFilter === 'ALL' || loan.status === loanStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle Click Outside for Dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (cosignerDropdownRef.current && !cosignerDropdownRef.current.contains(event.target as Node)) {
        setIsCosignerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = members.filter(m => 
    m.accountStatus === 'Active' && (
      m.name.toLowerCase().includes(borrowerSearch.toLowerCase()) || 
      m.id.toLowerCase().includes(borrowerSearch.toLowerCase())
    )
  );

  // Filter cosigners: Must be Active, NOT the borrower, and matches search
  const filteredCosigners = members.filter(m => 
    m.accountStatus === 'Active' && 
    m.id !== borrowerId &&
    (
      m.name.toLowerCase().includes(cosignerSearch.toLowerCase()) || 
      m.id.toLowerCase().includes(cosignerSearch.toLowerCase())
    )
  );

  const handleSelectBorrower = (member: Member) => {
    setBorrowerId(member.id);
    setBorrowerSearch(member.name);
    setIsDropdownOpen(false);
    // Reset cosigner if it matches the new borrower
    if (cosignerId === member.id) {
        setCosignerId('');
        setCosignerSearch('');
    }
  };

  const handleSelectCosigner = (member: Member) => {
    setCosignerId(member.id);
    setCosignerSearch(member.name);
    setIsCosignerDropdownOpen(false);
  };
  
  // Load Application into Form
  const handleReviewApplication = (app: LoanApplication) => {
      const borrower = members.find(m => m.id === app.memberId);
      if (!borrower) {
          notify("Borrower not found in database.", "error");
          return;
      }
      
      setBorrowerId(borrower.id);
      setBorrowerSearch(borrower.name);
      setLoanAmount(app.amount.toString());
      setTerm(app.term);
      setActiveApplicationId(app.id);
      
      const proposedCosigner = members.find(m => m.id === app.proposedCosignerId);
      if (proposedCosigner) {
          setCosignerId(proposedCosigner.id);
          setCosignerSearch(proposedCosigner.name);
          notify(`Reviewing application for ${borrower.name}. Cosigner ${proposedCosigner.name} selected.`, "info");
      } else {
          notify(`Reviewing application for ${borrower.name}. Proposed cosigner ID (${app.proposedCosignerId}) not found. Please select manually.`, "error");
          setCosignerId('');
          setCosignerSearch('');
      }
      
      // Scroll to form (simple implementation)
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleRejectApplication = (appId: string) => {
      if (window.confirm("Are you sure you want to reject this application?")) {
          setLoanApplications(prev => prev.map(app => app.id === appId ? { ...app, status: 'REJECTED' } : app));
          notify("Application rejected.", "info");
      }
  };

  // 2024 Policy Fee Calculation
  const calculateApplicationFee = (amount: number, months: number) => {
    if (amount < 2500) {
        return 30; // Under $2500 (Usually 12 months)
    } else {
        // Between $2501 and $5000
        return months === 24 ? 70 : 50; 
    }
  };

  const createLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility?.eligible) {
      notify("Member not eligible for this loan.", "error");
      return;
    }
    
    if (!cosignerId) {
      notify("A cosigner is required for all loans.", "error");
      return;
    }

    // Check cosigner eligibility
    const cosignerEligibility = checkEligibility(cosignerId);
    if (!cosignerEligibility.eligible) {
      notify(`Cosigner not eligible: ${cosignerEligibility.reason}`, "error");
      return;
    }

    const requestedAmount = parseFloat(loanAmount);
    if (isNaN(requestedAmount) || requestedAmount > (eligibility.limit || 0)) {
       notify("Invalid amount or exceeds limit.", "error");
       return;
    }

    // Calculate Application Fee
    const appFee = calculateApplicationFee(requestedAmount, term);

    // Determine Final Loan Principal based on Fee Type
    let finalPrincipal = requestedAmount;
    if (feeType === 'capitalized') {
        finalPrincipal += appFee;
    }

    // Calculate first due date: 10th of the next month
    const now = new Date();
    const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    
    // Generate sequential loan ID: L001-25, L002-25, etc.
    const currentYear = now.getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    
    // Find the highest sequence number for current year
    const currentYearLoans = loans.filter(loan => {
      const loanYear = loan.id.split('-')[1];
      return loanYear === yearSuffix;
    });
    
    const maxSequence = currentYearLoans.reduce((max, loan) => {
      const match = loan.id.match(/^L(\d+)-/);
      if (match) {
        const seq = parseInt(match[1], 10);
        return seq > max ? seq : max;
      }
      return max;
    }, 0);
    
    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    const loanId = `L${nextSequence}-${yearSuffix}`;

    // Generate payment schedule if interest rate is set
    const paymentSchedule = interestRate > 0 
      ? financialService.generatePaymentSchedule(
          loanId,
          finalPrincipal,
          interestRate,
          term,
          new Date().toISOString(),
          interestType
        )
      : undefined;

    const newLoan: Loan = {
      id: loanId,
      borrowerId,
      cosignerId: cosignerId,
      originalAmount: finalPrincipal,
      remainingBalance: finalPrincipal,
      termMonths: term,
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      nextPaymentDue: nextDue.toISOString(),
      issuedBy: issuedBy, // Save the board member who issued it
      interestRate: interestRate > 0 ? interestRate : undefined,
      interestType: interestRate > 0 ? interestType : undefined,
      totalInterestAccrued: 0,
      lastInterestCalculation: interestRate > 0 ? new Date().toISOString() : undefined,
      autoPayEnabled: enableAutopay,
      paymentSchedule,
      missedPayments: 0,
      gracePeriodDays
    };

    setLoans([newLoan, ...loans]);
    const updatedMember = members.find(m => m.id === borrowerId);
    const memberWithLoan = updatedMember ? { ...updatedMember, activeLoanId: newLoan.id } : null;
    
    if (memberWithLoan) {
      setMembers(members.map(m => m.id === borrowerId ? memberWithLoan : m));
    }
    
    // Sync to Google Sheets
    if (isSheetsConfigured()) {
        sheetService.createLoan(newLoan).catch(err => console.error('Sheet sync error:', err));
        // Sync updated member with activeLoanId
        if (memberWithLoan) {
            sheetService.updateMember(memberWithLoan).catch(err => console.error('Sheet sync error:', err));
        }
    }
    
    // Create Transactions: Disbursal AND Fee
    const newTransactions: Transaction[] = [
        { 
            id: Math.random().toString(36).substr(2, 9), 
            memberId: borrowerId, 
            type: 'LOAN_DISBURSAL' as const, 
            amount: requestedAmount, 
            date: new Date().toISOString(), 
            description: 'Loan Disbursal',
            paymentMethod: disbursalMethod,
            receivedBy: issuedBy,
            status: 'completed'
        },
        {
            id: Math.random().toString(36).substr(2, 9),
            memberId: borrowerId, 
            type: 'FEE' as const, 
            amount: appFee, 
            date: new Date().toISOString(), 
            description: feeType === 'capitalized' 
                ? `Application Fee (${term} Mo) - Added to Principal` 
                : `Application Fee (${term} Mo) - Paid Upfront`,
            status: 'completed'
        },
        ...transactions
    ];
    setTransactions(newTransactions);
    
    // Sync transactions to Google Sheets
    if (isSheetsConfigured()) {
        newTransactions.slice(0, 2).forEach(txn => {
            sheetService.createTransaction(txn).catch(err => console.error('Sheet sync error:', err));
        });
    }
    
    // If this came from an application, update status
    if (activeApplicationId) {
        setLoanApplications(prev => prev.map(app => app.id === activeApplicationId ? { ...app, status: 'APPROVED' } : app));
        if (isSheetsConfigured()) {
            const updatedApp = loanApplications.find(app => app.id === activeApplicationId);
            if (updatedApp) {
                sheetService.updateApplication({ ...updatedApp, status: 'APPROVED' }).catch(err => console.error('Sheet sync error:', err));
            }
        }
        setActiveApplicationId(null);
    }
    
    const successMsg = feeType === 'capitalized' 
        ? `Loan issued! $${appFee} fee added to principal.` 
        : `Loan issued! Please collect $${appFee} fee upfront.`;
    
    notify(successMsg);
    setBorrowerId('');
    setBorrowerSearch('');
    setCosignerId('');
    setCosignerSearch('');
    setLoanAmount('');
    setFeeType('upfront');
    setDisbursalMethod('Check');
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentLoan || !repayAmount) return;
    
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) {
        notify("Please enter a valid amount.", "error");
        return;
    }
    
    const now = new Date();
    const dueDate = new Date(repaymentLoan.nextPaymentDue);
    const isLate = now.getTime() > new Date(dueDate.setHours(23,59,59,999)).getTime(); 
    
    const lateFee = isLate ? 5.00 : 0;

    if (amount > (repaymentLoan.remainingBalance + lateFee + 0.01)) { 
        notify("Amount exceeds remaining balance (including fees).", "error");
        return;
    }

    repayLoan(repaymentLoan.id, amount, repayMethod, repayReceivedBy);
    setRepaymentLoan(null);
    setRepayAmount('');
    setRepayMethod('Cash'); 
    setRepayReceivedBy('Nangpi');
  };

  const repayLoan = (loanId: string, amount: number, method: string, receiver: string) => {
     const loan = loans.find(l => l.id === loanId);
     if (!loan) return;

     const now = new Date();
     const dueDate = new Date(loan.nextPaymentDue);
     const isLate = now.getTime() > new Date(dueDate.setHours(23,59,59,999)).getTime();
     const lateFee = isLate ? 5.00 : 0;
     
     const newTransactions = [...transactions];
     
     let currentBalance = loan.remainingBalance;

     if (isLate) {
         newTransactions.unshift({
             id: Math.random().toString(36).substr(2, 9),
             memberId: loan.borrowerId,
             type: 'FEE',
             amount: 5.00,
             date: new Date().toISOString(),
             description: 'Late Fee: Missed Payment Due Date',
             status: 'completed'
         });
         currentBalance += 5.00;
     }

     let newBalance = currentBalance - amount;
     if (newBalance < 0.01) newBalance = 0;
     
     const newStatus = newBalance === 0 ? 'PAID' : 'ACTIVE';

     let updatedNextPaymentDue = loan.nextPaymentDue;
     if (newStatus === 'ACTIVE') {
         const currentDueDate = new Date(loan.nextPaymentDue);
         const targetYear = currentDueDate.getFullYear();
         const targetMonth = currentDueDate.getMonth() + 1; 
         const nextDate = new Date(targetYear, targetMonth, 10);
         updatedNextPaymentDue = nextDate.toISOString();
     }

     setLoans(loans.map(l => l.id === loanId ? { 
         ...l, 
         remainingBalance: newBalance, 
         status: newStatus,
         nextPaymentDue: updatedNextPaymentDue
     } : l));
     
     newTransactions.unshift({ 
         id: Math.random().toString(36).substr(2, 9), 
         memberId: loan.borrowerId, 
         type: 'LOAN_REPAYMENT', 
         amount: amount, 
         date: new Date().toISOString(), 
         description: 'Loan Repayment',
         paymentMethod: method,
         receivedBy: receiver,
         status: 'completed'
     });
     
     setTransactions(newTransactions);

     // Sync to Google Sheets
     if (isSheetsConfigured()) {
         const updatedLoan = loans.find(l => l.id === loanId);
         if (updatedLoan) {
             sheetService.updateLoan({ 
                 ...updatedLoan, 
                 remainingBalance: newBalance, 
                 status: newStatus,
                 nextPaymentDue: updatedNextPaymentDue
             }).catch(err => console.error('Sheet sync error:', err));
         }
         // Sync new transactions (repayment and potential late fee)
         newTransactions.slice(0, isLate ? 2 : 1).forEach(txn => {
             sheetService.createTransaction(txn).catch(err => console.error('Sheet sync error:', err));
         });
     }

     if (newStatus === 'PAID') {
       const updatedMember = members.find(m => m.id === loan.borrowerId);
       setMembers(members.map(m => m.id === loan.borrowerId ? { ...m, activeLoanId: null, lastLoanPaidDate: new Date().toISOString() } : m));
       // Sync member update
       if (isSheetsConfigured() && updatedMember) {
           sheetService.updateMember({ ...updatedMember, activeLoanId: null, lastLoanPaidDate: new Date().toISOString() }).catch(err => console.error('Sheet sync error:', err));
       }
       notify("Loan fully paid off!", "success");
     } else {
       const msg = isLate 
           ? `Repayment recorded with $5.00 Late Fee applied. Next due: ${new Date(updatedNextPaymentDue).toLocaleDateString()}`
           : `Repayment recorded. Next due: ${new Date(updatedNextPaymentDue).toLocaleDateString()}`;
       notify(msg, isLate ? 'info' : 'success');
     }
  };

  // --- LOAN AGREEMENT PRINT LOGIC ---
  const printLoanAgreement = (loan: Loan) => {
      const borrower = members.find(m => m.id === loan.borrowerId);
      const cosigner = members.find(m => m.id === loan.cosignerId);
      const issueDate = new Date(loan.startDate);
      const firstPaymentDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 10);
      
      // Calculate end date
      const endDate = new Date(firstPaymentDate);
      endDate.setMonth(endDate.getMonth() + (loan.termMonths - 1));
      
      const monthlyPayment = loan.originalAmount / loan.termMonths;
      
      // Mapping: Nickname -> Legal Name for Contract
      const BOARD_SIGNERS: Record<string, string> = {
          'Nangpi': 'Nang Ngaih Thang',
          'Pu Tuang': 'Cin Lam Tuang',
          'John Tuang': 'Thang Za Tuang',
          'Muan': 'Nang Muan Lian',
          'Mangpi': 'Mangpi D. Jasuan'
      };

      // Determine authorized signer based on who issued the loan
      const issuerNickname = loan.issuedBy || 'Nangpi'; // Default to President if missing
      const authorizedSigner = BOARD_SIGNERS[issuerNickname] || issuerNickname;

      const win = window.open('', '_blank', 'height=900,width=800');
      if (!win) return;

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loan Agreement - ${borrower?.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Times+New+Roman&display=swap');
            @page { 
                size: A4; 
                margin: 0; 
            }
            body { 
                font-family: 'Times New Roman', serif; 
                margin: 0;
                padding: 0;
                color: #222; 
                line-height: 1.3; 
                width: 210mm;
                height: 297mm;
                background-color: #fff;
                position: relative;
                font-size: 10.5pt;
            }
            .no-print { display: none !important; }
            @media print {
                .no-print { display: none !important; }
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
            
            /* Main Border Container (Inset 12mm for printer safety) */
            .page-container {
                position: absolute;
                top: 12mm;
                left: 12mm;
                right: 12mm;
                bottom: 12mm;
                border: 2px solid #C00000; /* Red Border */
                padding: 5px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            .inner-border {
                border: 1px solid #4472C4; /* Blue Inner Border */
                height: 100%;
                padding: 10px 30px;
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
            }

            /* Watermark */
            .watermark {
                position: absolute;
                top: 55%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 65pt;
                color: rgba(200, 200, 200, 0.12); /* Very faint grey/pink */
                font-weight: bold;
                white-space: nowrap;
                z-index: 0;
                pointer-events: none;
                letter-spacing: 10px;
            }

            /* Seal */
            .seal {
                position: absolute;
                bottom: 110px;
                left: 50%;
                transform: translateX(-50%);
                width: 90px;
                height: 90px;
                border: 3px solid rgba(220, 200, 200, 0.5);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 0;
                pointer-events: none;
            }
            .seal-inner {
                width: 72px;
                height: 72px;
                border: 1px solid rgba(220, 200, 200, 0.5);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: rgba(180, 150, 150, 0.5);
                font-weight: bold;
                font-size: 6pt;
                transform: rotate(-10deg);
            }

            /* Content Layer */
            .content {
                position: relative;
                z-index: 10;
                flex: 1;
            }

            /* Header */
            .header { text-align: center; margin-bottom: 10px; } 
            .company-name {
                color: #8B0000;
                font-size: 22pt;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .sub-header {
                color: #4472C4;
                font-size: 9pt;
                font-family: Arial, sans-serif;
                letter-spacing: 4px;
                text-transform: uppercase;
                margin: 4px auto;
                border-bottom: 2px solid #4472C4;
                border-top: 2px solid #4472C4;
                display: inline-block;
                padding: 2px 20px;
                width: 50%;
            }
            .email {
                color: #666;
                font-size: 8pt;
                margin-top: 2px;
            }

            .title {
                text-align: center;
                font-size: 16pt;
                font-weight: bold;
                margin-bottom: 12px;
                letter-spacing: 1px;
                text-decoration: underline;
            }

            /* Top Info */
            .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 10.5pt;
                margin-bottom: 12px;
                font-weight: bold;
            }

            /* Sections */
            .section {
                margin-bottom: 10px;
            }
            .section-title {
                color: #C00000;
                font-weight: bold;
                font-size: 10.5pt;
                text-transform: uppercase;
                margin-bottom: 4px;
                border-bottom: 1px solid #eee;
            }
            .body-text {
                margin-bottom: 4px;
            }
            ul {
                margin: 4px 0 6px 20px;
                padding: 0;
                list-style-type: disc;
            }
            li {
                margin-bottom: 3px;
                text-align: justify;
            }

            /* Signatures */
            .signatures {
                margin-top: 20px;
                font-size: 10pt;
            }
            .sig-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 22px;
            }
            .sig-line {
                border-bottom: 1px solid #000;
                flex: 1;
                margin: 0 10px;
                text-align: center;
                font-family: 'Courier New', monospace; 
                font-weight: bold;
            }
            .sig-date {
                width: 120px;
                border-bottom: 1px solid #000;
                text-align: center;
            }
            .sig-label {
                width: 100px;
                font-weight: bold;
            }
            .sig-name {
                width: 250px;
                text-align: left;
                font-style: italic;
                font-size: 9pt;
                margin-left: 110px; /* Aligns under line roughly */
            }

            /* Footer */
            .footer {
                margin-top: auto;
                font-size: 7pt;
                border-top: 1px solid #C00000;
                padding-top: 5px;
                text-align: center;
                color: #444;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="inner-border">
                <div class="watermark">MILLIONAIRES CLUB</div>
                <div class="seal"><div class="seal-inner">OFFICIAL<br>SEAL<br>2025</div></div>

                <div class="content">
                    <div class="header">
                        <div class="company-name">Millionaires Club</div>
                        <div class="sub-header">Financial Services</div>
                        <div class="email">info.millionairesclubusa@gmail.com</div>
                    </div>

                    <div class="title">LOAN AGREEMENT</div>

                    <div class="info-row">
                        <div>Date: ${issueDate.toLocaleDateString()}</div>
                        <div>Principal Amount: $${loan.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
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
                            <div class="sig-line">${loan.borrowerSignature ? `<img src="${loan.borrowerSignature}" style="max-height:40px;" />` : ''}</div>
                            <span class="sig-label" style="width:auto;">Date:</span>
                            <div class="sig-date">${loan.signedDate ? new Date(loan.signedDate).toLocaleDateString() : ''}</div>
                        </div>
                        <div style="margin-top:-20px; margin-bottom:20px; font-size:9pt;">(${borrower?.name})</div>

                        <!-- Cosigner -->
                        <div class="sig-row">
                            <span class="sig-label">Co-Signer:</span>
                            <div class="sig-line">${loan.cosignerSignature ? `<img src="${loan.cosignerSignature}" style="max-height:40px;" />` : ''}</div>
                            <span class="sig-label" style="width:auto;">Date:</span>
                            <div class="sig-date">${loan.cosignerSignedDate ? new Date(loan.cosignerSignedDate).toLocaleDateString() : ''}</div>
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
          <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 100;">
             <button onclick="window.print()" style="padding: 10px 20px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">PRINT PDF</button>
          </div>
        </body>
        </html>
      `);
      win.document.close();
  };

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

          // Split schedule into two pages (12 months per page)
          const firstHalf = schedule.slice(0, 12);
          const secondHalf = schedule.slice(12);
          
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Loan Payment Schedule</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
                <style>
                  @page {
                    size: A4;
                    margin: 0;
                  }
                  body {
                    font-family: 'Inter', sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #fff;
                    font-size: 10pt;
                    color: #1e293b;
                  }
                  /* Contract Border Style */
                  .page-container {
                    width: calc(100% - 20mm);
                    margin: 10mm auto;
                    border: 2px solid #C00000; /* Red Outer */
                    padding: 8px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    page-break-inside: avoid;
                  }
                  .page-container.page-break { page-break-after: always; }
                  .page-container.second-page { page-break-before: always; }
                  .inner-border {
                    border: 1px solid #4472C4; /* Blue Inner */
                    padding: 18px 24px;
                    box-sizing: border-box;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                  }

                  .watermark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 72pt;
                    color: rgba(200, 200, 200, 0.05);
                    font-weight: 900;
                    white-space: nowrap;
                    z-index: 0;
                    pointer-events: none;
                  }
                  
                  .content {
                    position: relative;
                    z-index: 10;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                  }

                  .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                    margin-bottom: 22px;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 10px;
                  }
                  .brand-main {
                    font-family: 'Playfair Display', serif;
                    font-size: 20pt;
                    color: #8B0000;
                    margin: 0;
                    line-height: 1;
                  }
                  .brand-sub {
                    font-size: 8pt;
                    color: #64748b;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-top: 5px;
                  }
                  .doc-title {
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 2px;
                  }
                  .doc-type {
                    font-size: 13pt;
                    font-weight: 700;
                    color: #0f172a;
                    text-transform: uppercase;
                    line-height: 1.2;
                  }
                  .doc-id {
                    font-family: monospace;
                    color: #94a3b8;
                    font-size: 9pt;
                    line-height: 1.2;
                  }

                  /* Stat Cards */
                  .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                  }
                  .stat-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 10px;
                  }
                  .stat-label {
                    font-size: 7pt;
                    text-transform: uppercase;
                    color: #64748b;
                    font-weight: 700;
                    margin-bottom: 2px;
                  }
                  .stat-value {
                    font-size: 11pt;
                    font-weight: 700;
                    color: #0f172a;
                  }
                  .text-emerald { color: #059669; }
                  .text-blue { color: #2563eb; }

                  /* Info Section */
                  .info-section {
                    display: flex;
                    gap: 30px;
                    margin-bottom: 20px;
                    font-size: 9pt;
                  }
                  .info-col { flex: 1; }
                  .info-row {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #f1f5f9;
                    padding: 6px 0;
                  }
                  .info-label { color: #64748b; font-weight: 500; }
                  .info-val { font-weight: 600; }

                  /* Visual Progress */
                  .progress-section {
                    margin-bottom: 20px;
                  }
                  .progress-container {
                    width: 100%;
                    height: 10px;
                    background: #e2e8f0;
                    border-radius: 5px;
                    overflow: hidden;
                    margin-bottom: 5px;
                  }
                  .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #059669);
                    width: ${progressPercent}%;
                  }
                  .progress-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8pt;
                    color: #64748b;
                  }

                  /* Table */
                  .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9pt;
                  }
                  .schedule-table th {
                    text-align: left;
                    padding: 8px 6px;
                    background: #f1f5f9;
                    color: #475569;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 7pt;
                    letter-spacing: 0.5px;
                  }
                  .schedule-table td {
                    padding: 8px 6px;
                    border-bottom: 1px solid #f1f5f9;
                  }
                  .schedule-table tr:last-child td { border-bottom: 2px solid #0f172a; }
                  .num-col { color: #94a3b8; font-weight: 600; width: 40px; }
                  .amount-col { font-family: monospace; font-weight: 600; }
                  
                  .status-pill {
                    display: inline-block;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-size: 6.5pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    min-width: 50px;
                    text-align: center;
                  }
                  .status-paid { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
                  .status-pending { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
                  .status-due { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }

                  .footer {
                    margin-top: auto;
                    text-align: center;
                    font-size: 7pt;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                  }
                  .no-print { display: none; }
                </style>
              </head>
              <body>
                    <div class="page-container page-break">
                    <div class="inner-border">
                        <div class="watermark">MILLIONAIRES CLUB</div>
                        
                        <div class="content">
                            <div class="header">
                                <div>
                                    <h1 class="brand-main">Millionaires Club</h1>
                                    <div class="brand-sub">Financial Services</div>
                                </div>
                                <div class="doc-title">
                                    <div class="doc-type">Repayment Schedule</div>
                                    <div class="doc-id">LOAN #${scheduleLoan.id}</div>
                                </div>
                            </div>

                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-label">Principal</div>
                                    <div class="stat-value">$${scheduleLoan.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Paid</div>
                                    <div class="stat-value text-emerald">$${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Balance</div>
                                    <div class="stat-value text-blue">$${(scheduleLoan.originalAmount - totalPaid).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Term</div>
                                    <div class="stat-value">${scheduleLoan.termMonths} Mo</div>
                                </div>
                            </div>

                            <div class="progress-section">
                                <div class="progress-container">
                                    <div class="progress-bar-fill"></div>
                                </div>
                                <div class="progress-labels">
                                    <span>Start</span>
                                    <span>${progressPercent.toFixed(1)}% Complete</span>
                                    <span>Finish</span>
                                </div>
                            </div>

                            <div class="info-section">
                                <div class="info-col">
                                    <div class="info-row">
                                        <span class="info-label">Borrower</span>
                                        <span class="info-val">${borrower?.name}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Member ID</span>
                                        <span class="info-val">${borrower?.id}</span>
                                    </div>
                                </div>
                                <div class="info-col">
                                    <div class="info-row">
                                        <span class="info-label">Issued</span>
                                        <span class="info-val">${new Date(scheduleLoan.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Status</span>
                                        <span class="info-val" style="text-transform:uppercase;">${scheduleLoan.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div style="flex:1; overflow:hidden;">
                                <table class="schedule-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 30px;">#</th>
                                            <th>Due Date</th>
                                            <th style="text-align:right;">Est. Payment</th>
                                            <th style="text-align:right;">Actual Paid</th>
                                            <th style="text-align:right;">Paid Date</th>
                                            <th style="text-align:center;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                  ${firstHalf.map((row) => {
                                            let statusClass = 'status-pending';
                                            let statusText = 'Pending';
                                            if (row.actual) {
                                                statusClass = 'status-paid';
                                                statusText = 'PAID';
                                            } else if (new Date() > row.dueDate) {
                                                statusClass = 'status-due';
                                                statusText = 'OVERDUE';
                                            }

                                            return `
                                            <tr>
                                                <td class="num-col">${row.number}</td>
                                                <td>${row.dueDate.toLocaleDateString()}</td>
                                                <td class="amount-col" style="text-align:right;">$${row.estimated.toFixed(2)}</td>
                                                <td class="amount-col" style="text-align:right; color:${row.actual ? '#059669' : '#94a3b8'};">
                                                    ${row.actual ? '$' + row.actual.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                                </td>
                                                <td style="text-align:right; font-size:8pt; color:#64748b;">
                                                    ${row.actualDate ? row.actualDate.toLocaleDateString() : ''}
                                                </td>
                                                <td style="text-align:center;">
                                                    <span class="status-pill ${statusClass}">${statusText}</span>
                                                </td>
                                            </tr>
                                        `}).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div class="footer">
                                &copy; 2025 Millionaires Club Board of Directors • Official Document<br>
                                Generated on ${new Date().toLocaleString()}
                            </div>
                        </div>
                    </div>
                  </div>
                        <!-- Second Page (months 13-24) -->
                        <div class="page-container second-page">
                        <div class="inner-border">
                          <div class="watermark">MILLIONAIRES CLUB</div>
                          <div class="content">
                            <div class="header">
                              <div>
                                <h1 class="brand-main">Millionaires Club</h1>
                                <div class="brand-sub">Financial Services</div>
                              </div>
                              <div class="doc-title">
                                <div class="doc-type">Repayment Schedule (cont.)</div>
                                <div class="doc-id">LOAN #${scheduleLoan.id}</div>
                              </div>
                            </div>

                            <div style="flex:1; overflow:hidden;">
                              <table class="schedule-table">
                                <thead>
                                  <tr>
                                    <th style="width: 30px;">#</th>
                                    <th>Due Date</th>
                                    <th style="text-align:right;">Est. Payment</th>
                                    <th style="text-align:right;">Actual Paid</th>
                                    <th style="text-align:right;">Paid Date</th>
                                    <th style="text-align:center;">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${secondHalf.map((row) => {
                                    let statusClass = 'status-pending';
                                    let statusText = 'Pending';
                                    if (row.actual) {
                                      statusClass = 'status-paid';
                                      statusText = 'PAID';
                                    } else if (new Date() > row.dueDate) {
                                      statusClass = 'status-due';
                                      statusText = 'OVERDUE';
                                    }

                                    return `
                                    <tr>
                                      <td class="num-col">${row.number}</td>
                                      <td>${row.dueDate.toLocaleDateString()}</td>
                                      <td class="amount-col" style="text-align:right;">$${row.estimated.toFixed(2)}</td>
                                      <td class="amount-col" style="text-align:right; color:${row.actual ? '#059669' : '#94a3b8'};">
                                        ${row.actual ? '$' + row.actual.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                      </td>
                                      <td style="text-align:right; font-size:8pt; color:#64748b;">
                                        ${row.actualDate ? row.actualDate.toLocaleDateString() : ''}
                                      </td>
                                      <td style="text-align:center;">
                                        <span class="status-pill ${statusClass}">${statusText}</span>
                                      </td>
                                    </tr>
                                  `}).join('')}
                                </tbody>
                              </table>
                            </div>

                            <div class="footer">
                              &copy; 2025 Millionaires Club Board of Directors • Official Document<br>
                              Generated on ${new Date().toLocaleString()}
                            </div>
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
                        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg">
                            <Printer size={18}/> Print Modern Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <LoanScheduleModal />
      
      {repaymentLoan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-white">Record Repayment</h3>
                     <button onClick={() => setRepaymentLoan(null)}><X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"/></button>
                 </div>
                 
                 {(() => {
                     const monthlyPayment = repaymentLoan.originalAmount / repaymentLoan.termMonths;
                     const now = new Date();
                     const dueDate = new Date(repaymentLoan.nextPaymentDue);
                     const isLate = now.getTime() > new Date(dueDate.setHours(23,59,59,999)).getTime();

                     return (
                         <>
                             {isLate && (
                                 <div className="mb-4 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-start gap-2">
                                     <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                     <div>
                                         <p className="text-xs font-bold text-red-700 dark:text-red-400">Payment Overdue</p>
                                         <p className="text-xs text-red-600 dark:text-red-300">A late fee of <strong>$5.00</strong> will be applied.</p>
                                     </div>
                                 </div>
                             )}

                             <div className="mb-4 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600 space-y-2">
                                 <div className="flex justify-between items-center">
                                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Current Balance</span>
                                     <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${repaymentLoan.remainingBalance.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                     <span className="text-xs text-slate-500 dark:text-slate-400">Min. Monthly Payment</span>
                                     <span className="text-sm font-medium text-slate-700 dark:text-slate-200">${monthlyPayment.toFixed(2)}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                     <span className="text-xs text-slate-500 dark:text-slate-400">Due Date</span>
                                     <span className={`text-sm font-medium ${isLate ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                                         {new Date(repaymentLoan.nextPaymentDue).toLocaleDateString()}
                                     </span>
                                 </div>
                             </div>
                         </>
                     );
                 })()}

                 <form onSubmit={handleRepaySubmit} className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Repayment Amount</label>
                         <div className="relative">
                             <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                             <input 
                                type="number" 
                                autoFocus
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                placeholder="0.00"
                                value={repayAmount}
                                onChange={(e) => setRepayAmount(e.target.value)}
                                max={repaymentLoan.remainingBalance + 5} // approximate safety
                                step="0.01"
                                required
                             />
                         </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Method</label>
                             <select 
                               className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                               value={repayMethod}
                               onChange={(e) => setRepayMethod(e.target.value)}
                             >
                                 <option value="Cash">Cash</option>
                                 <option value="Check">Check</option>
                                 <option value="Zelle">Zelle</option>
                                 <option value="Bank Transfer">Bank</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Received By</label>
                             <select 
                               className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                               value={repayReceivedBy}
                               onChange={(e) => setRepayReceivedBy(e.target.value)}
                             >
                                 <option value="Nangpi">Nangpi</option>
                                 <option value="Pu Tuang">Pu Tuang</option>
                                 <option value="Mangpi">Mangpi</option>
                                 <option value="Muan">Muan</option>
                                 <option value="John Tuang">John Tuang</option>
                             </select>
                         </div>
                     </div>

                     <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 dark:shadow-none transition-colors">Confirm Payment</button>
                 </form>
             </div>
        </div>
      )}

      {/* Pending Applications List */}
      {pendingApplications.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800">
             <h3 className="font-bold text-lg text-amber-900 dark:text-amber-400 mb-4 flex items-center gap-2">
                 <Hourglass size={20}/> Pending Loan Applications
             </h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold border-b border-amber-200 dark:border-amber-800">
                         <tr>
                             <th className="px-4 py-3">Applicant</th>
                             <th className="px-4 py-3">Amount</th>
                             <th className="px-4 py-3">Term</th>
                             <th className="px-4 py-3">Proposed Cosigner</th>
                             <th className="px-4 py-3 text-right">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                         {pendingApplications.map(app => {
                             const applicant = members.find(m => m.id === app.memberId);
                             const cosigner = members.find(m => m.id === app.proposedCosignerId);
                             return (
                                 <tr key={app.id} className="hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
                                     <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                         {applicant?.name} 
                                         <div className="text-xs text-slate-500 dark:text-slate-400">{app.purpose}</div>
                                     </td>
                                     <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">${app.amount.toLocaleString()}</td>
                                     <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{app.term} Mo</td>
                                     <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                         {cosigner ? (
                                            <span className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                                                <CheckCircle size={12}/> {cosigner.name} ({cosigner.id})
                                            </span>
                                         ) : (
                                            <span className="flex items-center gap-1.5 text-red-500">
                                                <AlertCircle size={12}/> ID: {app.proposedCosignerId} (Not Found)
                                            </span>
                                         )}
                                     </td>
                                     <td className="px-4 py-3 text-right">
                                         <div className="flex justify-end gap-2">
                                             <button 
                                                 onClick={() => handleReviewApplication(app)}
                                                 className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                                             >
                                                 Review
                                             </button>
                                             <button 
                                                 onClick={() => handleRejectApplication(app.id)}
                                                 className="px-3 py-1 bg-white dark:bg-slate-700 text-red-600 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/30"
                                             >
                                                 Reject
                                             </button>
                                         </div>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Loan Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600 dark:text-blue-400"/> Issue New Loan
          </h3>
          <form onSubmit={createLoan} className="space-y-4">
            
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Borrower</label>
              <div className="relative">
                <input 
                  type="text"
                  className={`w-full pl-10 pr-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${!borrowerId ? 'border-slate-200 dark:border-slate-600' : 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/30'}`}
                  placeholder="Search member name or ID..."
                  value={borrowerSearch}
                  onChange={(e) => {
                    setBorrowerSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (borrowerId) setBorrowerId(''); 
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  disabled={!!activeApplicationId} // Disable borrower change if reviewing app
                />
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <ChevronDown className={`absolute right-3 top-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={18} />
              </div>

              {isDropdownOpen && !activeApplicationId && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(m => (
                      <div 
                        key={m.id} 
                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0"
                        onClick={() => handleSelectBorrower(m)}
                      >
                        <div>
                          <div className="font-bold text-slate-700 dark:text-slate-200">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.id}</div>
                        </div>
                        {borrowerId === m.id && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">No eligible members found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={cosignerDropdownRef}>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cosigner <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="text"
                  className={`w-full pl-10 pr-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${!cosignerId ? 'border-slate-200 dark:border-slate-600' : 'border-purple-500 bg-purple-50/30 dark:bg-purple-900/30'}`}
                  placeholder="Search cosigner name or ID..."
                  value={cosignerSearch}
                  onChange={(e) => {
                    setCosignerSearch(e.target.value);
                    setIsCosignerDropdownOpen(true);
                    if (cosignerId) setCosignerId('');
                  }}
                  onFocus={() => setIsCosignerDropdownOpen(true)}
                  disabled={!borrowerId} 
                  required
                />
                <UserPlus className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <ChevronDown className={`absolute right-3 top-3.5 text-slate-400 transition-transform ${isCosignerDropdownOpen ? 'rotate-180' : ''}`} size={18} />
              </div>

              {isCosignerDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredCosigners.length > 0 ? (
                    filteredCosigners.map(m => (
                      <div 
                        key={m.id} 
                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0"
                        onClick={() => handleSelectCosigner(m)}
                      >
                        <div>
                          <div className="font-bold text-slate-700 dark:text-slate-200">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.id}</div>
                        </div>
                        {cosignerId === m.id && <Check size={16} className="text-purple-600 dark:text-purple-400" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">No eligible cosigners found.</div>
                  )}
                </div>
              )}
            </div>

            {borrowerId && (
              <div className={`p-3 rounded-xl text-sm ${eligibility?.eligible ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-100 dark:border-red-800'}`}>
                {eligibility?.eligible 
                  ? <span className="flex items-center gap-2"><CheckCircle size={16}/> Eligible for up to ${eligibility?.limit?.toLocaleString()}</span> 
                  : <span className="flex items-center gap-2"><AlertCircle size={16}/> {eligibility?.reason}</span>}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Amount</label>
              <input 
                type="number" 
                className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={loanAmount} 
                onChange={e => setLoanAmount(e.target.value)}
                placeholder="0.00"
                disabled={!eligibility?.eligible}
              />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Term</label>
              <select className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={term} onChange={e => setTerm(Number(e.target.value))}>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>

            {/* Interest Rate Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={interestRate}
                  onChange={e => setInterestRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Interest Type
                </label>
                <select 
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  value={interestType}
                  onChange={e => setInterestType(e.target.value as 'simple' | 'compound')}
                  disabled={interestRate === 0}
                >
                  <option value="simple">Simple</option>
                  <option value="compound">Compound</option>
                </select>
              </div>
            </div>

            {/* Autopay & Grace Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAutopay}
                    onChange={e => setEnableAutopay(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Enable Autopay
                  </span>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                  Auto-deduct from contributions
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={gracePeriodDays}
                  onChange={e => setGracePeriodDays(parseInt(e.target.value) || 7)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Disbursal Method</label>
                    <select 
                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 dark:text-white"
                        value={disbursalMethod}
                        onChange={(e) => setDisbursalMethod(e.target.value)}
                    >
                        <option value="Check">Check</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cash">Cash</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Issued By</label>
                    <select 
                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 dark:text-white"
                        value={issuedBy}
                        onChange={(e) => setIssuedBy(e.target.value)}
                    >
                        <option value="Nangpi">Nangpi</option>
                        <option value="Pu Tuang">Pu Tuang</option>
                        <option value="Mangpi">Mangpi</option>
                        <option value="Muan">Muan</option>
                        <option value="John Tuang">John Tuang</option>
                    </select>
                </div>
            </div>

            {loanAmount && !isNaN(parseFloat(loanAmount)) && (
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Application Fee:</span>
                        <span className="font-bold text-slate-800 dark:text-white">${calculateApplicationFee(parseFloat(loanAmount), term)}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-3">
                        <label className="flex items-center gap-3 p-2 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-600 transition-colors">
                            <input 
                                type="radio" 
                                name="feeType" 
                                value="upfront" 
                                checked={feeType === 'upfront'} 
                                onChange={() => setFeeType('upfront')}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">Pay Upfront</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Collect fee via cash/check now</span>
                            </div>
                            <Wallet size={16} className="text-slate-400"/>
                        </label>
                        <label className="flex items-center gap-3 p-2 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-slate-600 transition-colors">
                            <input 
                                type="radio" 
                                name="feeType" 
                                value="capitalized" 
                                checked={feeType === 'capitalized'} 
                                onChange={() => setFeeType('capitalized')}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">Add to Principal</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Roll fee into loan balance</span>
                            </div>
                            <FileText size={16} className="text-slate-400"/>
                        </label>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Monthly Payment</span>
                            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                ${(() => {
                                    const principal = parseFloat(loanAmount) + (feeType === 'capitalized' ? calculateApplicationFee(parseFloat(loanAmount), term) : 0);
                                    if (interestRate === 0) {
                                        return (principal / term).toFixed(2);
                                    }
                                    const monthlyRate = interestRate / 100 / 12;
                                    const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
                                    return payment.toFixed(2);
                                })()}
                            </span>
                        </div>
                        {interestRate > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Est. Total Interest</span>
                                <span className="text-purple-600 dark:text-purple-400 font-bold">
                                    ${(() => {
                                        const principal = parseFloat(loanAmount) + (feeType === 'capitalized' ? calculateApplicationFee(parseFloat(loanAmount), term) : 0);
                                        const monthlyRate = interestRate / 100 / 12;
                                        const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
                                        const totalPaid = monthlyPayment * term;
                                        return (totalPaid - principal).toFixed(2);
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!eligibility?.eligible || !cosignerId}
            >
              {activeApplicationId ? 'Approve & Issue Loan' : 'Issue Loan'}
            </button>
            {activeApplicationId && (
                <button 
                    type="button" 
                    onClick={() => {
                        setActiveApplicationId(null);
                        setBorrowerId('');
                        setBorrowerSearch('');
                        setLoanAmount('');
                        setCosignerSearch('');
                    }}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm"
                >
                    Cancel Review
                </button>
            )}
          </form>
        </div>
        
        {/* Recent Repayments List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
           <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <History size={20} className="text-emerald-600 dark:text-emerald-400"/> Recent Repayments
           </h4>
           <div className="flex-1 overflow-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
                 <tr>
                   <th className="px-3 py-2">Date</th>
                   <th className="px-3 py-2">Borrower</th>
                   <th className="px-3 py-2 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                 {recentRepayments.map(t => {
                   const borrower = members.find(m => m.id === t.memberId);
                   return (
                     <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                       <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                           {new Date(t.date).toLocaleDateString()}
                           <div className="text-[10px] text-slate-400 dark:text-slate-500">Via {t.paymentMethod}</div>
                       </td>
                       <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{borrower?.name || t.memberId}</td>
                       <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">${t.amount.toLocaleString()}</td>
                     </tr>
                   );
                 })}
                 {recentRepayments.length === 0 && (
                   <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400 italic">No repayments recorded yet.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
           <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
             <div className="text-xs text-slate-400">Total Active Loans</div>
             <div className="text-xl font-bold text-slate-800 dark:text-white">${loans.filter(l => l.status === 'ACTIVE').reduce((acc, curr) => acc + curr.remainingBalance, 0).toLocaleString()}</div>
           </div>
        </div>
      </div>

      {/* Active Loans List */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Loan Portfolio</h3>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by borrower, cosigner, or loan ID..."
              value={loanSearchTerm}
              onChange={(e) => setLoanSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={loanStatusFilter}
            onChange={(e) => setLoanStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Loans ({loans.length})</option>
            <option value="ACTIVE">Active ({loans.filter(l => l.status === 'ACTIVE').length})</option>
            <option value="PAID">Paid Off ({loans.filter(l => l.status === 'PAID').length})</option>
            <option value="DEFAULTED">Defaulted ({loans.filter(l => l.status === 'DEFAULTED').length})</option>
          </select>
        </div>
        
        {filteredLoans.length > 0 && (
          <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredLoans.length} of {loans.length} loans
          </div>
        )}
        
        <div className="space-y-4">
          {filteredLoans.map(loan => {
            const borrower = members.find(m => m.id === loan.borrowerId);
            return (
              <div key={loan.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-200 dark:hover:border-blue-500 transition-colors bg-white dark:bg-slate-800">
                 <div className="flex-1">
                   <h4 className="font-bold text-slate-800 dark:text-white">{borrower?.name} <span className="text-slate-400 font-normal text-sm">({loan.borrowerId})</span></h4>
                   <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-2 items-center">
                     <span className="bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded border border-slate-100 dark:border-slate-600">Started: {new Date(loan.startDate).toLocaleDateString()}</span>
                     <span className="bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded border border-slate-100 dark:border-slate-600">Term: {loan.termMonths}mo</span>
                     <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded border border-amber-100 dark:border-amber-800">
                       <Clock size={12}/> Next Due: {new Date(loan.nextPaymentDue).toLocaleDateString()}
                     </span>
                     {loan.cosignerId && (
                         <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded border border-purple-100 dark:border-purple-800 flex items-center gap-1">
                             <UserPlus size={12} /> Cosigner: {members.find(m => m.id === loan.cosignerId)?.name}
                         </span>
                     )}
                   </div>
                 </div>
                 <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide mb-2 ${
                      loan.status === 'ACTIVE' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      loan.status === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {loan.status}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Balance</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">${loan.remainingBalance.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">of ${loan.originalAmount.toLocaleString()}</p>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => printLoanAgreement(loan)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                      title="Print Loan Agreement"
                    >
                      <FileSignature size={14} /> Contract
                    </button>
                    {loan.status === 'ACTIVE' && (
                      <>
                        <button 
                          onClick={() => setScheduleLoan(loan)}
                          className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                        >
                          <Calendar size={14} /> Schedule
                        </button>
                        <button 
                          onClick={() => {
                            setRepaymentLoan(loan);
                            setRepayAmount('');
                          }}
                          className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                        >
                          Record Payment
                        </button>
                      </>
                    )}
                 </div>
              </div>
            );
          })}
          {filteredLoans.length === 0 && (
             <p className="text-slate-400 italic text-center py-8">
               {loans.length === 0 ? 'No loans in portfolio.' : 'No loans match your filters.'}
             </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoansComponent;
