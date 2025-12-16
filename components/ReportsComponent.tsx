
import React, { useState, useRef, useEffect } from 'react';
import { Member, Loan, Transaction } from '../types';
import { FileText, Download, Filter, Printer, Search, ChevronDown, Check, Calendar } from 'lucide-react';

interface ReportsProps {
  members: Member[];
  loans: Loan[];
  transactions: Transaction[];
}

const ReportsComponent: React.FC<ReportsProps> = ({ members, loans, transactions }) => {
  const [reportType, setReportType] = useState<'financial' | 'member'>('financial');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Member Search State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setSearchTerm(member.name);
    setIsDropdownOpen(false);
  };

  // --- REPORT GENERATION LOGIC ---

  const generateFinancialData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, index) => {
        const monthStart = new Date(selectedYear, index, 1);
        const monthEnd = new Date(selectedYear, index + 1, 0, 23, 59, 59);

        const monthTrans = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
        });

        return {
            month,
            contributions: monthTrans.filter(t => t.type === 'CONTRIBUTION').reduce((sum, t) => sum + t.amount, 0),
            loansIssued: monthTrans.filter(t => t.type === 'LOAN_DISBURSAL').reduce((sum, t) => sum + t.amount, 0),
            repayments: monthTrans.filter(t => t.type === 'LOAN_REPAYMENT').reduce((sum, t) => sum + t.amount, 0),
            fees: monthTrans.filter(t => t.type === 'FEE').reduce((sum, t) => sum + t.amount, 0),
        };
    });
    return data;
  };

  const printFinancialReport = () => {
      const data = generateFinancialData();
      const totalContributions = data.reduce((sum, d) => sum + d.contributions, 0);
      const totalLoans = data.reduce((sum, d) => sum + d.loansIssued, 0);
      const totalRepayments = data.reduce((sum, d) => sum + d.repayments, 0);
      const totalFees = data.reduce((sum, d) => sum + d.fees, 0);

      const win = window.open('', '', 'height=900,width=800');
      win?.document.write('<html><head><title>Financial Report</title>');
      win?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      win?.document.write('</head><body class="p-8 font-sans text-slate-800">');
      
      win?.document.write(`
        <div class="text-center mb-8 border-b-2 border-slate-800 pb-4">
            <h1 class="text-3xl font-bold uppercase tracking-wider mb-2">Millionaires Club</h1>
            <h2 class="text-xl text-slate-600">Annual Financial Report - ${selectedYear}</h2>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="p-4 bg-emerald-50 border border-emerald-100 rounded text-center">
                <div class="text-xs font-bold text-emerald-800 uppercase">Contributions</div>
                <div class="text-xl font-bold text-emerald-600">$${totalContributions.toLocaleString()}</div>
            </div>
            <div class="p-4 bg-blue-50 border border-blue-100 rounded text-center">
                <div class="text-xs font-bold text-blue-800 uppercase">Loans Issued</div>
                <div class="text-xl font-bold text-blue-600">$${totalLoans.toLocaleString()}</div>
            </div>
            <div class="p-4 bg-indigo-50 border border-indigo-100 rounded text-center">
                <div class="text-xs font-bold text-indigo-800 uppercase">Repayments</div>
                <div class="text-xl font-bold text-indigo-600">$${totalRepayments.toLocaleString()}</div>
            </div>
            <div class="p-4 bg-amber-50 border border-amber-100 rounded text-center">
                <div class="text-xs font-bold text-amber-800 uppercase">Fees Collected</div>
                <div class="text-xl font-bold text-amber-600">$${totalFees.toLocaleString()}</div>
            </div>
        </div>

        <table class="w-full text-sm text-left border-collapse mb-8">
            <thead>
                <tr class="bg-slate-100 border-b-2 border-slate-300">
                    <th class="p-3">Month</th>
                    <th class="p-3 text-right">Contributions</th>
                    <th class="p-3 text-right">Loans Issued</th>
                    <th class="p-3 text-right">Repayments</th>
                    <th class="p-3 text-right">Fees</th>
                    <th class="p-3 text-right font-bold">Net Flow</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((row, i) => `
                    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
                        <td class="p-3 font-bold text-slate-700">${row.month}</td>
                        <td class="p-3 text-right text-emerald-600">+$${row.contributions.toLocaleString()}</td>
                        <td class="p-3 text-right text-red-500">-$${row.loansIssued.toLocaleString()}</td>
                        <td class="p-3 text-right text-blue-600">+$${row.repayments.toLocaleString()}</td>
                        <td class="p-3 text-right text-amber-600">+$${row.fees.toLocaleString()}</td>
                        <td class="p-3 text-right font-bold text-slate-800">$${(row.contributions + row.repayments + row.fees - row.loansIssued).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="text-center text-xs text-slate-400 mt-12">
            Generated on ${new Date().toLocaleDateString()} • internal use only
        </div>
      `);

      win?.document.write('</body></html>');
      win?.document.close();
      setTimeout(() => win?.print(), 500);
  };

  const printMemberStatement = () => {
      if (!selectedMemberId) return;
      const member = members.find(m => m.id === selectedMemberId);
      if (!member) return;

      const memberTrans = transactions.filter(t => t.memberId === selectedMemberId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const activeLoan = loans.find(l => l.borrowerId === selectedMemberId && l.status === 'ACTIVE');

      const win = window.open('', '', 'height=900,width=800');
      win?.document.write('<html><head><title>Member Statement</title>');
      win?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      win?.document.write('</head><body class="p-10 font-sans text-slate-800">');
      
      win?.document.write(`
        <div class="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div>
                <h1 class="text-3xl font-bold uppercase tracking-wider text-slate-900">Account Statement</h1>
                <p class="text-slate-500 text-sm mt-1">Millionaires Club Financial Services</p>
            </div>
            <div class="text-right">
                <div class="font-bold text-xl">${member.name}</div>
                <div class="text-sm text-slate-600">ID: ${member.id}</div>
                <div class="text-sm text-slate-600">Date: ${new Date().toLocaleDateString()}</div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-8 mb-8">
            <div class="p-5 border border-slate-200 rounded-lg bg-slate-50">
                <h3 class="font-bold text-slate-700 mb-3 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Contribution Summary</h3>
                <div class="flex justify-between mb-1">
                    <span class="text-sm text-slate-600">Total Accumulated:</span>
                    <span class="font-bold text-emerald-700 text-lg">$${member.totalContribution.toLocaleString()}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-slate-600">Join Date:</span>
                    <span class="font-medium text-slate-800">${new Date(member.joinDate).toLocaleDateString()}</span>
                </div>
            </div>

            <div class="p-5 border border-slate-200 rounded-lg bg-slate-50">
                <h3 class="font-bold text-slate-700 mb-3 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Loan Status</h3>
                ${activeLoan ? `
                    <div class="flex justify-between mb-1">
                        <span class="text-sm text-slate-600">Active Balance:</span>
                        <span class="font-bold text-blue-700 text-lg">$${activeLoan.remainingBalance.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-slate-600">Next Payment Due:</span>
                        <span class="font-medium text-red-600">${new Date(activeLoan.nextPaymentDue).toLocaleDateString()}</span>
                    </div>
                ` : `
                    <div class="text-slate-400 italic text-sm py-2">No active loans. Eligible for credit.</div>
                `}
            </div>
        </div>

        <h3 class="font-bold text-slate-800 mb-4 text-lg border-l-4 border-slate-800 pl-3">Transaction History</h3>
        <table class="w-full text-sm text-left border-collapse mb-8">
            <thead>
                <tr class="bg-slate-100 border-b border-slate-300">
                    <th class="p-3">Date</th>
                    <th class="p-3">Type</th>
                    <th class="p-3">Description</th>
                    <th class="p-3 text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${memberTrans.map((t, i) => {
                    const isCredit = t.type === 'CONTRIBUTION' || t.type === 'LOAN_REPAYMENT';
                    return `
                    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100">
                        <td class="p-3 text-slate-600">${new Date(t.date).toLocaleDateString()}</td>
                        <td class="p-3 font-bold text-xs uppercase text-slate-500">${t.type.replace('_', ' ')}</td>
                        <td class="p-3 text-slate-700">${t.description || '-'}</td>
                        <td class="p-3 text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-700'}">
                            ${isCredit ? '+' : '-'}$${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                    </tr>
                `}).join('')}
                ${memberTrans.length === 0 ? '<tr><td colspan="4" class="p-4 text-center text-slate-400">No transactions recorded.</td></tr>' : ''}
            </tbody>
        </table>

        <div class="mt-12 pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-500">
            <div>Thank you for being a valued member of the Millionaires Club.</div>
            <div>Page 1 of 1</div>
        </div>
      `);

      win?.document.write('</body></html>');
      win?.document.close();
      setTimeout(() => win?.print(), 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                    <Printer size={24} className="text-blue-600 dark:text-blue-400"/> Report Center
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate and print PDF statements and financial summaries.</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button 
                    onClick={() => setReportType('financial')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${reportType === 'financial' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Financial Reports
                </button>
                <button 
                    onClick={() => setReportType('member')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${reportType === 'member' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Member Statements
                </button>
            </div>
        </div>

        <div className="min-h-[300px]">
            {reportType === 'financial' ? (
                <div className="max-w-2xl">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Select Fiscal Year</label>
                    <div className="flex gap-4 items-center">
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 font-bold text-slate-700 dark:text-white"
                        >
                            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button 
                            onClick={printFinancialReport}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            <Printer size={18}/> Generate Annual Report
                        </button>
                    </div>
                    
                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 text-sm">Preview: {selectedYear} Summary</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-600">
                                <div className="text-xs text-slate-400">Total Inflow</div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    ${generateFinancialData().reduce((acc, curr) => acc + curr.contributions + curr.repayments + curr.fees, 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-600">
                                <div className="text-xs text-slate-400">Total Outflow (Loans)</div>
                                <div className="text-lg font-bold text-red-500 dark:text-red-400">
                                    ${generateFinancialData().reduce((acc, curr) => acc + curr.loansIssued, 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Select Member</label>
                    
                    {/* Searchable Dropdown */}
                    <div className="relative mb-4" ref={dropdownRef}>
                        <div className="relative">
                            <input 
                                type="text"
                                className={`w-full pl-10 pr-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${!selectedMemberId ? 'border-slate-200 dark:border-slate-600' : 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/30'}`}
                                placeholder="Search member name or ID..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsDropdownOpen(true);
                                    if (selectedMemberId) setSelectedMemberId(''); 
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                            />
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <ChevronDown className={`absolute right-3 top-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map(m => (
                                        <div 
                                            key={m.id} 
                                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0"
                                            onClick={() => handleSelectMember(m)}
                                        >
                                            <div>
                                                <div className="font-bold text-slate-700 dark:text-slate-200">{m.name}</div>
                                                <div className="text-xs text-slate-400">{m.id}</div>
                                            </div>
                                            {selectedMemberId === m.id && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-400 text-sm">No members found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={printMemberStatement}
                        disabled={!selectedMemberId}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={18}/> Generate Statement PDF
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReportsComponent;
