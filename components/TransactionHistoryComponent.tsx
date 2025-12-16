
import React, { useState, useMemo } from 'react';
import { Member, Transaction } from '../types';
import { formatDateTime } from '../constants';
import { FileText, Search, Filter, Download } from 'lucide-react';

interface Props {
  members: Member[];
  transactions: Transaction[];
}

const TransactionHistoryComponent: React.FC<Props> = ({ members, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const member = members.find(m => m.id === t.memberId);
      const matchesSearch = searchTerm === '' || 
        member?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || t.type === filterType;
      
      const transactionDate = new Date(t.date);
      const matchesDateFrom = !dateFrom || transactionDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || transactionDate <= new Date(dateTo + 'T23:59:59');
      
      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [transactions, searchTerm, filterType, dateFrom, dateTo, members]);

  const exportToCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Member', 'Type', 'Description', 'Method', 'Received By', 'Amount'];
    const rows = filteredTransactions.map(t => {
      const member = members.find(m => m.id === t.memberId);
      return [
        new Date(t.date).toLocaleString(),
        t.id,
        member?.name || t.memberId,
        t.type,
        t.description,
        t.paymentMethod || '',
        t.receivedBy || '',
        t.amount
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="text-slate-400" />
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Global Transaction Ledger</h3>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="CONTRIBUTION">Contributions</option>
          <option value="LOAN_DISBURSAL">Loan Disbursals</option>
          <option value="LOAN_REPAYMENT">Loan Repayments</option>
          <option value="FEE">Fees</option>
          <option value="DISTRIBUTION">Distributions</option>
        </select>
        
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From Date"
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
        />
        
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To Date"
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      
      {filteredTransactions.length > 0 && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredTransactions.map(t => {
              const member = members.find(m => m.id === t.memberId);
              const isCredit = t.type === 'CONTRIBUTION' || t.type === 'LOAN_REPAYMENT';
              return (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDateTime(t.date)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{member?.name || t.memberId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                       t.type === 'CONTRIBUTION' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                       t.type === 'LOAN_DISBURSAL' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' :
                       'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}>
                      {t.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{t.description}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs">
                      {t.paymentMethod && (
                          <div className="flex flex-col">
                              <span>{t.paymentMethod}</span>
                              {t.receivedBy && <span className="text-slate-400">Rec: {t.receivedBy}</span>}
                          </div>
                      )}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {isCredit ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredTransactions.length === 0 && (
         <div className="text-center py-12 text-slate-400">
           {transactions.length === 0 ? 'No transactions found in ledger.' : 'No transactions match your filters.'}
         </div>
      )}
    </div>
  );
};

export default TransactionHistoryComponent;
