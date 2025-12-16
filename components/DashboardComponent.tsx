
import React, { useState } from 'react';
import { Member, Loan, Transaction, LoanApplication } from '../types';
import { Users, Wallet, CreditCard, TrendingUp, DollarSign, AlertCircle, Calendar, UserCheck, UserX, ChevronRight, CheckCircle, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import LatePaymentAlerts from './LatePaymentAlerts';

interface DashboardProps {
  members: Member[];
  loans: Loan[];
  transactions: Transaction[];
  loanApplications: LoanApplication[];
  setActiveTab: (tab: string) => void;
}

const DashboardComponent: React.FC<DashboardProps> = ({ members, loans, transactions, loanApplications, setActiveTab }) => {
  const totalMembers = members.length;
  const activeMembersCount = members.filter(m => m.accountStatus === 'Active').length;
  const inactiveMembersCount = members.filter(m => m.accountStatus === 'Inactive').length;
  
  const totalFunds = members.reduce((sum, m) => sum + m.totalContribution, 0);
  const totalLoaned = loans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.originalAmount, 0);
  const activeLoanCount = loans.filter(l => l.status === 'ACTIVE').length;
  
  const pendingApplicationsCount = loanApplications.filter(app => app.status === 'PENDING').length;

  // --- Chart Data (Last 6 months contributions) ---
  const chartData = transactions
    .filter(t => t.type === 'CONTRIBUTION')
    .slice(0, 50) 
    .map(t => ({ date: new Date(t.date).toLocaleDateString(), amount: t.amount }));

  // --- Loan Dues Logic ---
  const activeLoans = loans
    .filter(l => l.status === 'ACTIVE')
    .sort((a, b) => new Date(a.nextPaymentDue).getTime() - new Date(b.nextPaymentDue).getTime());

  // --- Contribution Dues Logic ---
  const date = new Date();
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
  const currentMonthName = date.toLocaleString('default', { month: 'long' });

  // Get IDs of members who have paid at least once this month
  const paidMemberIds = new Set(transactions
    .filter(t => {
        const d = new Date(t.date);
        return t.type === 'CONTRIBUTION' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .map(t => t.memberId)
  );

  const unpaidMembers = members.filter(m => m.accountStatus === 'Active' && !paidMemberIds.has(m.id));

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Alert Section for Pending Approvals */}
      {pendingApplicationsCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-700 dark:text-amber-200">
                      <Bell size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg">Pending Loan Approvals</h3>
                      <p className="text-amber-700 dark:text-amber-300 text-sm">There are <strong>{pendingApplicationsCount}</strong> new loan application(s) waiting for review.</p>
                  </div>
              </div>
              <button 
                  onClick={() => setActiveTab('loans')}
                  className="whitespace-nowrap px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-200 dark:shadow-none transition-colors"
              >
                  Review Now
              </button>
          </div>
      )}

      {/* 1. Top Stats / Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div 
            onClick={() => setActiveTab('members')}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Total Members</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{totalMembers}</h3>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors"><Users size={20}/></div>
            </div>
        </div>

        {/* Active Members */}
        <div 
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Active Members</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{activeMembersCount}</h3>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors"><UserCheck size={20}/></div>
            </div>
        </div>

        {/* Inactive Members */}
        <div 
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Inactive Members</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{inactiveMembersCount}</h3>
                </div>
                <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors"><UserX size={20}/></div>
            </div>
        </div>

        {/* Total Funds */}
        <div 
            onClick={() => setActiveTab('contributions')}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Total Funds</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">${totalFunds.toLocaleString()}</h3>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors"><Wallet size={20}/></div>
            </div>
        </div>
      </div>

      {/* 2. Dues & Action Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Loan Payments Due */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-96">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600 dark:text-blue-400"/> Loan Payment Dues
                  </h3>
                  <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">{activeLoans.length} Active</span>
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                          <tr>
                              <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50">Borrower</th>
                              <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50">Due Date</th>
                              <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 text-right">Min. Due</th>
                              <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 text-right">Balance</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                          {activeLoans.map(loan => {
                              const borrower = members.find(m => m.id === loan.borrowerId);
                              const dueDate = new Date(loan.nextPaymentDue);
                              const isOverdue = new Date() > dueDate;
                              const monthlyDue = loan.originalAmount / loan.termMonths;

                              return (
                                  <tr key={loan.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                      <td className="px-5 py-3">
                                          <div className="font-medium text-slate-800 dark:text-slate-200">{borrower?.name || loan.borrowerId}</div>
                                          <div className="text-xs text-slate-400">{loan.id}</div>
                                      </td>
                                      <td className="px-5 py-3">
                                          <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                              {isOverdue && <AlertCircle size={14}/>}
                                              {dueDate.toLocaleDateString()}
                                          </div>
                                          {isOverdue && <div className="text-[10px] text-red-500 dark:text-red-400">Late Fee Applies</div>}
                                      </td>
                                      <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                          ${monthlyDue.toFixed(2)}
                                      </td>
                                      <td className="px-5 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                          ${loan.remainingBalance.toLocaleString()}
                                      </td>
                                  </tr>
                              );
                          })}
                          {activeLoans.length === 0 && (
                              <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No active loans pending.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center">
                  <button onClick={() => setActiveTab('loans')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-center gap-1">
                      Manage Loans <ChevronRight size={14}/>
                  </button>
              </div>
          </div>

          {/* Right: Monthly Contribution Dues */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-96">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <AlertCircle size={18} className="text-amber-500"/> Pending Contributions
                  </h3>
                  <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md">{currentMonthName}</span>
              </div>
              
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                   <span><strong>{unpaidMembers.length}</strong> members have not paid this month.</span>
                   <div className="flex gap-2">
                       <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Paid</span>
                       <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending</span>
                   </div>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                           <tr>
                               <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50">Member Name</th>
                               <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50">ID</th>
                               <th className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 text-right">Action</th>
                           </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                          {unpaidMembers.slice(0, 50).map(member => (
                              <tr key={member.id} className="hover:bg-amber-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{member.name}</td>
                                  <td className="px-5 py-2.5 font-mono text-xs text-slate-400">{member.id}</td>
                                  <td className="px-5 py-2.5 text-right">
                                      <button 
                                        onClick={() => setActiveTab('contributions')}
                                        className="text-[10px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 transition-colors"
                                      >
                                          Record Pay
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {unpaidMembers.length === 0 && (
                              <tr><td colSpan={3} className="p-8 text-center text-emerald-500 font-medium"><CheckCircle size={32} className="mx-auto mb-2"/> All active members have paid for {currentMonthName}!</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              {unpaidMembers.length > 50 && (
                  <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                      Showing first 50 of {unpaidMembers.length} pending
                  </div>
              )}
          </div>

      </div>

      {/* Late Payment Alerts */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <LatePaymentAlerts 
          members={members} 
          loans={loans}
          onNavigateToLoan={(loanId) => setActiveTab('loans')}
        />
      </div>

      {/* 3. New Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-500"/> Loan Portfolio Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: loans.filter(l => l.status === 'ACTIVE').length, color: '#3b82f6' },
                    { name: 'Paid Off', value: loans.filter(l => l.status === 'PAID').length, color: '#10b981' },
                    { name: 'Defaulted', value: loans.filter(l => l.status === 'DEFAULTED').length, color: '#ef4444' }
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { color: '#3b82f6' },
                    { color: '#10b981' },
                    { color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Users size={20} className="text-purple-500"/> Member Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: activeMembersCount, color: '#10b981' },
                    { name: 'Inactive', value: inactiveMembersCount, color: '#94a3b8' }
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Contribution Trend Line Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500"/> Contribution Trend (Last 30 Days)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(() => {
              const last30Days = new Date();
              last30Days.setDate(last30Days.getDate() - 30);
              const dailyContributions: Record<string, number> = {};
              
              transactions
                .filter(t => t.type === 'CONTRIBUTION' && new Date(t.date) >= last30Days)
                .forEach(t => {
                  const day = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  dailyContributions[day] = (dailyContributions[day] || 0) + t.amount;
                });
              
              return Object.entries(dailyContributions).map(([date, amount]) => ({ date, amount })).slice(-15);
            })()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3}/>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`}/>
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Contributions']}
              />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Original Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500"/> Recent Contributions
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3}/>
                <XAxis dataKey="date" hide />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`}/>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [`$${value}`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats / Liquidity */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Liquidity Overview</h3>
            <div className="space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                    <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Available to Lend</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">${(totalFunds - totalLoaned).toLocaleString()}</p>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${((totalFunds - totalLoaned) / totalFunds) * 100}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">{(((totalFunds - totalLoaned) / totalFunds) * 100).toFixed(1)}% of total funds</p>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Active Loans Value</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">${totalLoaned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Avg. Loan Size</span>
                    <span className="font-bold text-slate-800 dark:text-white">${activeLoanCount > 0 ? (totalLoaned / activeLoanCount).toLocaleString(undefined, {maximumFractionDigits:0}) : 0}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComponent;
