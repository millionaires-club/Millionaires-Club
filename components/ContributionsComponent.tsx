
import React, { useState, useRef, useEffect } from 'react';
import { Member, Transaction } from '../types';
import { Plus, Download, Search, ChevronDown, Check } from 'lucide-react';
import { sheetService, isSheetsConfigured } from '../services/sheetService';

interface ContributionsProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ContributionsComponent: React.FC<ContributionsProps> = ({ members, setMembers, transactions, setTransactions, notify }) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  
  // New Fields
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedBy, setReceivedBy] = useState('Nangpi');

  // Searchable Dropdown State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    m.accountStatus === 'Active' && (
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setSearchTerm(member.name);
    setIsDropdownOpen(false);
  };

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount) {
      notify("Please select a member and enter an amount", "error");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      notify("Please enter a valid amount", "error");
      return;
    }

    // Update Transaction Log
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      memberId: selectedMemberId,
      type: 'CONTRIBUTION',
      amount: numAmount,
      date: new Date().toISOString(),
      description: 'Monthly Contribution',
      paymentMethod,
      receivedBy,
      status: 'completed'
    };
    setTransactions([newTransaction, ...transactions]);

    // Update Member Total
    const updatedMember = members.find(m => m.id === selectedMemberId);
    setMembers(members.map(m => 
      m.id === selectedMemberId 
        ? { ...m, totalContribution: m.totalContribution + numAmount }
        : m
    ));

    // Sync to Google Sheets
    if (isSheetsConfigured()) {
        sheetService.createTransaction(newTransaction).catch(err => console.error('Sheet sync error:', err));
        if (updatedMember) {
            sheetService.updateMember({ 
                ...updatedMember, 
                totalContribution: updatedMember.totalContribution + numAmount 
            }).catch(err => console.error('Sheet sync error:', err));
        }
    }

    notify(`Contribution of $${numAmount} recorded.`);
    setAmount('');
  };

  const recentContributions = transactions.filter(t => t.type === 'CONTRIBUTION').slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
      {/* Entry Form */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
          <Plus size={20} className="text-emerald-600 dark:text-emerald-400"/> Record Contribution
        </h3>
        <form onSubmit={handleAddContribution} className="space-y-4">
          
          {/* Searchable Member Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Select Member</label>
            <div className="relative">
              <input 
                type="text"
                className={`w-full pl-10 pr-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${!selectedMemberId ? 'border-slate-200 dark:border-slate-600' : 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/30'}`}
                placeholder="Search name or ID..."
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

            {/* Dropdown List */}
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
                      {selectedMemberId === m.id && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">No active members found.</div>
                )}
              </div>
            )}
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Amount ($)</label>
             <input 
               type="number" 
               className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
               placeholder="0.00"
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               required
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Payment Type</label>
                  <select 
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Zelle">Zelle</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Auto-pay">Auto-pay</option>
                  </select>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Received By</label>
                  <select 
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                  >
                      <option value="Nangpi">Nangpi</option>
                      <option value="Pu Tuang">Pu Tuang</option>
                      <option value="Mangpi">Mangpi</option>
                      <option value="Muan">Muan</option>
                      <option value="John Tuang">John Tuang</option>
                      <option value="Admin">Admin</option>
                  </select>
              </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none">
            Confirm Payment
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Recent Contributions</h3>
          <button className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 text-sm">
            <Download size={16}/> Export CSV
          </button>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentContributions.map(t => {
                const member = members.find(m => m.id === t.memberId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(t.date).toLocaleDateString()}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Rec: {t.receivedBy || 'System'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{member?.name || t.memberId}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.paymentMethod || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">+${t.amount.toLocaleString()}</td>
                  </tr>
                );
              })}
              {recentContributions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No contributions recorded recently.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContributionsComponent;
