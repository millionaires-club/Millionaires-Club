import express from 'express';
import { query } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Contribution (or manual transaction)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { member_id, type, amount, description, payment_method, received_by } = req.body;

  try {
    const result = await query(
      `INSERT INTO transactions (member_id, type, amount, description, payment_method, received_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [member_id, type, amount, description, payment_method, received_by]
    );

    // If it's a contribution, update member total
    if (type === 'CONTRIBUTION') {
        await query(
            `UPDATE members SET total_contribution = total_contribution + $1 WHERE id = $2`,
            [amount, member_id]
        );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating transaction' });
  }
});

export default router;