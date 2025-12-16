import express from 'express';
import pool, { query } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM loans ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Loan (Disbursement) - Transactional
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  const { borrower_id, cosigner_id, original_amount, term_months, start_date, fee_type, disbursal_method, issued_by } = req.body;

  try {
    await client.query('BEGIN');

    // 1. Calculate Fee
    let fees = 0;
    if (original_amount <= 2500) {
        fees = 30;
    } else {
        fees = term_months <= 12 ? 50 : 70;
    }

    let finalPrincipal = original_amount;
    if (fee_type === 'capitalized') {
        finalPrincipal += fees;
    }

    // 2. Create Loan Record
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);
    nextDue.setDate(10); // Due on 10th

    const loanRes = await client.query(
      `INSERT INTO loans (borrower_id, cosigner_id, original_amount, remaining_balance, term_months, start_date, next_payment_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [borrower_id, cosigner_id, finalPrincipal, finalPrincipal, term_months, start_date || new Date(), nextDue]
    );
    const loan = loanRes.rows[0];

    // 3. Create Disbursement Transaction
    await client.query(
        `INSERT INTO transactions (member_id, type, amount, description, payment_method, received_by)
         VALUES ($1, 'LOAN_DISBURSAL', $2, $3, $4, $5)`,
        [borrower_id, original_amount, `Loan Disbursal #${loan.id.substring(0,8)}`, disbursal_method, issued_by]
    );

    // 4. Create Fee Transaction
    const feeDesc = fee_type === 'capitalized' ? 'Application Fee (Capitalized)' : 'Application Fee (Paid Upfront)';
    await client.query(
        `INSERT INTO transactions (member_id, type, amount, description, payment_method)
         VALUES ($1, 'FEE', $2, $3, 'System')`,
        [borrower_id, fees, feeDesc]
    );
    
    // 5. Update Member Active Loan
    // Note: In strict SQL we might not need an active_loan_id on member if we query loans table status,
    // but if you have that column in your schema, update it here.

    await client.query('COMMIT');
    res.status(201).json(loan);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Transaction failed' });
  } finally {
    client.release();
  }
});

// Repay Loan
router.post('/:id/repay', authenticateToken, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    const { amount, payment_method, received_by } = req.body;
    const loanId = req.params.id;

    try {
        await client.query('BEGIN');

        // 1. Get Loan
        const loanRes = await client.query('SELECT * FROM loans WHERE id = $1', [loanId]);
        const loan = loanRes.rows[0];
        if(!loan) throw new Error('Loan not found');

        // 2. Calculate New Balance
        let newBalance = Number(loan.remaining_balance) - Number(amount);
        let status = 'ACTIVE';
        if (newBalance <= 0) {
            newBalance = 0;
            status = 'PAID';
        }

        // 3. Update Loan
        const nextDue = new Date(loan.next_payment_due);
        if (status === 'ACTIVE') {
            nextDue.setMonth(nextDue.getMonth() + 1);
        }

        await client.query(
            `UPDATE loans SET remaining_balance = $1, status = $2, next_payment_due = $3 WHERE id = $4`,
            [newBalance, status, nextDue, loanId]
        );

        // 4. Record Transaction
        await client.query(
            `INSERT INTO transactions (member_id, type, amount, description, payment_method, received_by)
             VALUES ($1, 'LOAN_REPAYMENT', $2, $3, $4, $5)`,
            [loan.borrower_id, amount, `Repayment for Loan #${loanId.substring(0,8)}`, payment_method, received_by]
        );

        await client.query('COMMIT');
        res.json({ message: 'Repayment successful', newBalance, status });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Repayment failed' });
    } finally {
        client.release();
    }
});

export default router;