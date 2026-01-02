import React from 'react';
import { Member, Loan } from '../types';
import { financialService } from '../services/financialService';
import { AlertTriangle, Clock, DollarSign, User } from 'lucide-react';
import { formatDate } from '../constants';

interface LatePaymentAlertsProps {
  members: Member[];
  loans: Loan[];
  onNavigateToLoan?: (loanId: string) => void;
}

const LatePaymentAlerts: React.FC<LatePaymentAlertsProps> = ({ members, loans, onNavigateToLoan }) => {
  const lateLoans = financialService.getLateLoansList(loans);

  if (lateLoans.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
            <Clock size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300">All Payments Current</h4>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">No late payments detected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          <h4 className="font-bold text-slate-800 dark:text-white">Late Payment Alerts</h4>
        </div>
        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
          {lateLoans.length} {lateLoans.length === 1 ? 'Loan' : 'Loans'}
        </span>
      </div>

      <div className="space-y-3">
        {lateLoans.map(loan => {
          const borrower = members.find(m => m.id === loan.borrowerId);
          const lateFee = financialService.calculateLateFee(loan);
          const nextPayment = loan.paymentSchedule 
            ? financialService.getNextPaymentDue(loan.paymentSchedule)
            : null;
          
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(loan.nextPaymentDue).getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div 
              key={loan.id}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-red-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToLoan && onNavigateToLoan(loan.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <User size={18} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">
                      {borrower?.name || 'Unknown Member'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Loan ID: {loan.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-600 dark:text-red-400">
                    {daysOverdue} days overdue
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Due: {formatDate(loan.nextPaymentDue)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Payment Due</div>
                  <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <DollarSign size={14} />
                    {nextPayment ? nextPayment.amount.toFixed(2) : (loan.remainingBalance / loan.termMonths).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Late Fee</div>
                  <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <DollarSign size={14} />
                    {lateFee.toFixed(2)}
                  </div>
                </div>
              </div>

              {loan.missedPayments && loan.missedPayments > 1 && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {loan.missedPayments} missed payments - High risk
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to loans tab with this loan ID
                    onNavigateToLoan && onNavigateToLoan(loan.id);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Record Payment
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Contact member action
                    if (borrower?.phone) {
                      window.open(`tel:${borrower.phone}`, '_blank');
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Contact Member
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Late</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              ${lateLoans.reduce((sum, l) => {
                const nextPayment = l.paymentSchedule ? financialService.getNextPaymentDue(l.paymentSchedule) : null;
                return sum + (nextPayment?.amount || l.remainingBalance / l.termMonths);
              }, 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Late Fees</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ${lateLoans.reduce((sum, l) => sum + financialService.calculateLateFee(l), 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">At Risk</div>
            <div className="text-lg font-bold text-slate-800 dark:text-white">
              {lateLoans.filter(l => (l.missedPayments || 0) > 1).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatePaymentAlerts;
