import { Loan, Member, Transaction, PaymentSchedule, FinancialProjection } from '../types';

/**
 * Financial Service
 * Handles interest calculations, autopay, payment schedules, and projections
 */

// ==================== INTEREST CALCULATIONS ====================

/**
 * Calculate simple interest
 * Formula: I = P × r × t
 */
export const calculateSimpleInterest = (
  principal: number,
  annualRate: number,
  daysElapsed: number
): number => {
  const dailyRate = annualRate / 100 / 365;
  return principal * dailyRate * daysElapsed;
};

/**
 * Calculate compound interest (daily compounding)
 * Formula: A = P(1 + r/n)^(nt)
 */
export const calculateCompoundInterest = (
  principal: number,
  annualRate: number,
  daysElapsed: number
): number => {
  const dailyRate = annualRate / 100 / 365;
  const amount = principal * Math.pow(1 + dailyRate, daysElapsed);
  return amount - principal;
};

/**
 * Calculate interest accrued on a loan since last calculation
 */
export const calculateLoanInterest = (loan: Loan): number => {
  if (!loan.interestRate || loan.status !== 'ACTIVE') return 0;

  const lastCalcDate = loan.lastInterestCalculation
    ? new Date(loan.lastInterestCalculation)
    : new Date(loan.startDate);
  
  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - lastCalcDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysElapsed <= 0) return 0;

  const interestType = loan.interestType || 'simple';
  
  if (interestType === 'compound') {
    return calculateCompoundInterest(loan.remainingBalance, loan.interestRate, daysElapsed);
  } else {
    return calculateSimpleInterest(loan.remainingBalance, loan.interestRate, daysElapsed);
  }
};

/**
 * Update loan with accrued interest
 */
export const accrueLoanInterest = (loan: Loan): Loan => {
  const interest = calculateLoanInterest(loan);
  
  return {
    ...loan,
    totalInterestAccrued: (loan.totalInterestAccrued || 0) + interest,
    remainingBalance: loan.remainingBalance + interest,
    lastInterestCalculation: new Date().toISOString()
  };
};

// ==================== PAYMENT SCHEDULES ====================

/**
 * Generate amortization schedule for a loan
 */
export const generatePaymentSchedule = (
  loanId: string,
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: string,
  interestType: 'simple' | 'compound' = 'simple'
): PaymentSchedule[] => {
  const schedule: PaymentSchedule[] = [];
  const monthlyRate = annualRate / 100 / 12;
  
  // Calculate monthly payment using amortization formula
  let monthlyPayment: number;
  if (annualRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = 
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  let remainingBalance = principal;
  const startDateTime = new Date(startDate);

  for (let month = 1; month <= termMonths; month++) {
    const dueDate = new Date(startDateTime);
    dueDate.setMonth(dueDate.getMonth() + month);

    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    
    // Adjust last payment to account for rounding
    if (month === termMonths) {
      schedule.push({
        id: `${loanId}-payment-${month}`,
        dueDate: dueDate.toISOString(),
        amount: remainingBalance + interestPayment,
        principal: remainingBalance,
        interest: interestPayment,
        status: 'pending'
      });
    } else {
      schedule.push({
        id: `${loanId}-payment-${month}`,
        dueDate: dueDate.toISOString(),
        amount: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        status: 'pending'
      });
      remainingBalance -= principalPayment;
    }
  }

  return schedule;
};

/**
 * Get next payment due from schedule
 */
export const getNextPaymentDue = (schedule: PaymentSchedule[]): PaymentSchedule | null => {
  const pending = schedule.filter(p => p.status === 'pending' || p.status === 'late');
  if (pending.length === 0) return null;
  
  // Sort by due date
  pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return pending[0];
};

/**
 * Mark payment in schedule as paid
 */
export const recordPaymentInSchedule = (
  schedule: PaymentSchedule[],
  paymentId: string,
  amount: number
): PaymentSchedule[] => {
  return schedule.map(payment => {
    if (payment.id === paymentId) {
      return {
        ...payment,
        status: 'paid',
        paidDate: new Date().toISOString(),
        paidAmount: amount
      };
    }
    return payment;
  });
};

// ==================== AUTOPAY ====================

/**
 * Calculate autopay amount for a member's loan
 */
export const calculateAutopayAmount = (
  member: Member,
  loan: Loan,
  contributionAmount: number
): number => {
  if (!member.autoPay || !loan.autoPayEnabled) return 0;

  // Use custom amount if set, otherwise calculate based on schedule
  if (member.autoPayAmount && member.autoPayAmount > 0) {
    return Math.min(member.autoPayAmount, contributionAmount, loan.remainingBalance);
  }

  // Default: try to pay monthly installment
  if (loan.paymentSchedule) {
    const nextPayment = getNextPaymentDue(loan.paymentSchedule);
    if (nextPayment) {
      return Math.min(nextPayment.amount, contributionAmount, loan.remainingBalance);
    }
  }

  // Fallback: 10% of contribution or remaining balance
  return Math.min(contributionAmount * 0.1, loan.remainingBalance);
};

/**
 * Process autopay deduction from contribution
 */
export const processAutopayDeduction = (
  member: Member,
  loan: Loan,
  contributionAmount: number
): { 
  loanPayment: number; 
  netContribution: number; 
  updatedLoan: Loan;
} => {
  const loanPayment = calculateAutopayAmount(member, loan, contributionAmount);
  const netContribution = contributionAmount - loanPayment;

  const updatedLoan: Loan = {
    ...loan,
    remainingBalance: loan.remainingBalance - loanPayment,
    lastPaymentDate: new Date().toISOString()
  };

  // Update payment schedule if exists
  if (loan.paymentSchedule && loanPayment > 0) {
    const nextPayment = getNextPaymentDue(loan.paymentSchedule);
    if (nextPayment) {
      updatedLoan.paymentSchedule = recordPaymentInSchedule(
        loan.paymentSchedule,
        nextPayment.id,
        loanPayment
      );
    }
  }

  // Mark as paid if fully repaid
  if (updatedLoan.remainingBalance <= 0.01) {
    updatedLoan.status = 'PAID';
    updatedLoan.remainingBalance = 0;
  }

  return { loanPayment, netContribution, updatedLoan };
};

// ==================== LATE PAYMENT DETECTION ====================

/**
 * Check if a loan payment is late
 */
export const isPaymentLate = (loan: Loan): boolean => {
  if (loan.status !== 'ACTIVE') return false;

  const today = new Date();
  const nextDue = new Date(loan.nextPaymentDue);
  const gracePeriod = loan.gracePeriodDays || 7;
  
  const daysPastDue = Math.floor(
    (today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysPastDue > gracePeriod;
};

/**
 * Get all late loans
 */
export const getLateLoansList = (loans: Loan[]): Loan[] => {
  return loans.filter(loan => isPaymentLate(loan));
};

/**
 * Calculate late payment fee
 */
export const calculateLateFee = (loan: Loan, baseFeePercent: number = 5): number => {
  if (!loan.paymentSchedule) return 0;
  
  const nextPayment = getNextPaymentDue(loan.paymentSchedule);
  if (!nextPayment) return 0;

  return nextPayment.amount * (baseFeePercent / 100);
};

/**
 * Update payment schedule statuses for late payments
 */
export const updateLatePaymentStatuses = (loan: Loan): Loan => {
  if (!loan.paymentSchedule) return loan;

  const today = new Date();
  const gracePeriod = loan.gracePeriodDays || 7;

  const updatedSchedule = loan.paymentSchedule.map(payment => {
    if (payment.status === 'pending') {
      const dueDate = new Date(payment.dueDate);
      const daysPastDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysPastDue > gracePeriod) {
        return { ...payment, status: 'late' as const };
      }
    }
    return payment;
  });

  const missedPayments = updatedSchedule.filter(p => p.status === 'late' || p.status === 'missed').length;

  return {
    ...loan,
    paymentSchedule: updatedSchedule,
    missedPayments
  };
};

// ==================== FINANCIAL PROJECTIONS ====================

/**
 * Project club finances for next 12 months
 */
export const generateFinancialProjections = (
  members: Member[],
  loans: Loan[],
  transactions: Transaction[],
  monthlyContributionRate: number = 100 // Average monthly contribution per member
): FinancialProjection[] => {
  const projections: FinancialProjection[] = [];
  const activeMembers = members.filter(m => m.accountStatus === 'Active');
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');

  // Calculate current total balance
  const currentBalance = members.reduce((sum, m) => sum + m.totalContribution, 0);

  // Calculate average interest rate
  const avgInterestRate = activeLoans.length > 0
    ? activeLoans.reduce((sum, l) => sum + (l.interestRate || 0), 0) / activeLoans.length
    : 0;

  for (let month = 1; month <= 12; month++) {
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + month);

    // Project contributions (with 5% growth rate)
    const growthFactor = Math.pow(1.05, month / 12);
    const projectedContributions = 
      activeMembers.length * monthlyContributionRate * growthFactor;

    // Project loan disbursements (decreasing trend)
    const projectedLoans = 
      (activeLoans.length * 1000) * (1 - month * 0.05);

    // Project interest income
    const totalLoanBalance = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const projectedInterest = 
      (totalLoanBalance * (avgInterestRate / 100)) / 12;

    // Calculate projected balance
    const projectedBalance = 
      currentBalance + 
      (projectedContributions * month) - 
      projectedLoans + 
      (projectedInterest * month);

    // Calculate risk score (0-100)
    const loanToAssetRatio = totalLoanBalance / currentBalance;
    const delinquencyRate = activeLoans.filter(l => isPaymentLate(l)).length / activeLoans.length;
    const riskScore = Math.min(100, Math.round(
      (loanToAssetRatio * 40) + 
      (delinquencyRate * 60)
    ));

    projections.push({
      month: projectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      projectedContributions,
      projectedLoans,
      projectedInterest,
      projectedBalance,
      riskScore
    });
  }

  return projections;
};

/**
 * Calculate portfolio health metrics
 */
export const calculatePortfolioHealth = (
  members: Member[],
  loans: Loan[]
): {
  totalAssets: number;
  totalLoaned: number;
  totalInterestEarned: number;
  defaultRate: number;
  averageLoanUtilization: number;
  healthScore: number;
} => {
  const totalAssets = members.reduce((sum, m) => sum + m.totalContribution, 0);
  const totalLoaned = loans
    .filter(l => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + l.remainingBalance, 0);
  
  const totalInterestEarned = loans.reduce(
    (sum, l) => sum + (l.totalInterestAccrued || 0),
    0
  );

  const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED').length;
  const defaultRate = loans.length > 0 ? (defaultedLoans / loans.length) * 100 : 0;

  const loanUtilization = totalAssets > 0 ? (totalLoaned / totalAssets) * 100 : 0;
  const lateLoans = getLateLoansList(loans).length;
  const lateRate = loans.length > 0 ? (lateLoans / loans.length) * 100 : 0;

  // Health score (0-100, higher is better)
  const healthScore = Math.max(0, Math.min(100,
    100 - 
    (defaultRate * 2) - 
    (lateRate * 1.5) -
    (loanUtilization > 80 ? (loanUtilization - 80) * 2 : 0)
  ));

  return {
    totalAssets,
    totalLoaned,
    totalInterestEarned,
    defaultRate,
    averageLoanUtilization: loanUtilization,
    healthScore: Math.round(healthScore)
  };
};

export const financialService = {
  // Interest
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateLoanInterest,
  accrueLoanInterest,
  
  // Payment Schedules
  generatePaymentSchedule,
  getNextPaymentDue,
  recordPaymentInSchedule,
  
  // Autopay
  calculateAutopayAmount,
  processAutopayDeduction,
  
  // Late Payments
  isPaymentLate,
  getLateLoansList,
  calculateLateFee,
  updateLatePaymentStatuses,
  
  // Projections
  generateFinancialProjections,
  calculatePortfolioHealth
};
