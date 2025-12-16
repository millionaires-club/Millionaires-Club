
export interface Member {
  id: string;
  name: string;
  nickname: string; // Added nickname field
  email: string;
  password?: string; // Added password field for authentication
  role?: 'admin' | 'treasurer' | 'member'; // User role for access control
  joinDate: string;
  accountStatus: 'Active' | 'Inactive';
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  beneficiary: string;
  totalContribution: number;
  activeLoanId: string | null;
  lastLoanPaidDate: string | null;
  autoPay?: boolean; // Enable automatic loan deductions from contributions
  autoPayAmount?: number; // Fixed amount to deduct per contribution
  photoUrl?: string; // Profile photo URL
}

export interface Loan {
  id: string;
  borrowerId: string;
  cosignerId?: string;
  originalAmount: number;
  remainingBalance: number;
  termMonths: number;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  startDate: string;
  nextPaymentDue: string;
  issuedBy?: string; // Added to track which board member authorized the loan
  borrowerSignature?: string;
  signedDate?: string;
  cosignerSignature?: string; // Cosigner signature data
  cosignerSignedDate?: string; // Date cosigner signed
  interestRate?: number; // Annual interest rate as percentage (e.g., 5.0 for 5%)
  interestType?: 'simple' | 'compound'; // Type of interest calculation
  totalInterestAccrued?: number; // Total interest accumulated
  lastInterestCalculation?: string; // Last date interest was calculated
  autoPayEnabled?: boolean; // Whether autopay is active for this loan
  paymentSchedule?: PaymentSchedule[]; // Custom payment plan
  missedPayments?: number; // Count of missed payments
  lastPaymentDate?: string; // Date of most recent payment
  gracePeriodDays?: number; // Days before marking payment as late (default 7)
}

export interface LoanApplication {
  id: string;
  memberId: string;
  amount: number;
  term: number;
  purpose: string;
  proposedCosignerId: string; // Changed from name to ID for accuracy
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Transaction {
  id: string;
  memberId: string;
  type: 'CONTRIBUTION' | 'LOAN_DISBURSAL' | 'LOAN_REPAYMENT' | 'FEE' | 'DISTRIBUTION';
  amount: number;
  date: string;
  description: string;
  paymentMethod?: string;
  receivedBy?: string;
  status?: 'completed' | 'pending' | 'failed';
}

export interface CommunicationLog {
  id: string;
  memberId: string;
  type: 'System' | 'Note' | 'Email' | 'SMS';
  content: string;
  date: string;
  direction: 'Inbound' | 'Outbound';
  adminId?: string;
}

export interface YearlyContribution {
  [year: number]: number;
}

export interface PaymentSchedule {
  id: string;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidDate?: string;
  paidAmount?: number;
}

export interface FinancialProjection {
  month: string;
  projectedContributions: number;
  projectedLoans: number;
  projectedInterest: number;
  projectedBalance: number;
  riskScore: number; // 0-100, higher is riskier
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'treasurer' | 'member';
  action: string; // e.g., 'CREATE_MEMBER', 'UPDATE_LOAN', 'DELETE_TRANSACTION'
  entityType: 'member' | 'loan' | 'transaction' | 'application' | 'system';
  entityId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  description: string;
}
