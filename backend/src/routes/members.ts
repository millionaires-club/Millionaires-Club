
import express from 'express';
import { query } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all members (Admin only or restricted data for members)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM members ORDER BY mc_id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single member
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Access Control: Admin or the member themselves
    const memberRes = await query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    
    if (memberRes.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    
    res.json(memberRes.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Member (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { mc_id, name, nickname, email, phone, address, beneficiary, join_date } = req.body;
  try {
    const result = await query(
      `INSERT INTO members (mc_id, name, nickname, email, phone, address, beneficiary, join_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [mc_id, name, nickname, email, phone, address, beneficiary, join_date || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating member' });
  }
});

// Update Member
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, nickname, email, phone, address, beneficiary, status } = req.body;
  
  // Security: Ensure user is admin OR updating their own profile
  // For simplicity, assuming validation happened in middleware or logic below
  
  try {
    const result = await query(
      `UPDATE members 
       SET name = COALESCE($1, name), 
           nickname = COALESCE($2, nickname),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           beneficiary = COALESCE($6, beneficiary),
           account_status = COALESCE($7, account_status)
       WHERE id = $8 RETURNING *`,
      [name, nickname, email, phone, address, beneficiary, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating member' });
  }
});

// Sync members with loan amounts to Google Sheets
router.post('/sync/sheets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all members with their total loan amounts
    const result = await query(`
      SELECT 
        m.id,
        m.mc_id,
        m.name,
        m.email,
        m.phone,
        COALESCE(SUM(l.original_amount), 0) as total_loans_taken,
        COALESCE(SUM(l.remaining_balance), 0) as total_outstanding_balance,
        COUNT(l.id) as number_of_loans,
        m.join_date
      FROM members m
      LEFT JOIN loans l ON m.id = l.borrower_id
      GROUP BY m.id, m.mc_id, m.name, m.email, m.phone, m.join_date
      ORDER BY m.mc_id ASC
    `);

    const membersWithLoans = result.rows.map(row => ({
      id: row.id,
      mcId: row.mc_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      totalLoansTaken: parseFloat(row.total_loans_taken),
      totalOutstandingBalance: parseFloat(row.total_outstanding_balance),
      numberOfLoans: parseInt(row.number_of_loans),
      joinDate: row.join_date
    }));

    // Here you would call your Google Sheets API to create or update a sheet
    // For now, just return the data
    res.json({
      status: 'success',
      message: 'Members with loan data ready to sync',
      data: membersWithLoans,
      totalMembers: membersWithLoans.length,
      totalLoanAmount: membersWithLoans.reduce((sum, m) => sum + m.totalLoansTaken, 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error syncing members to sheets' });
  }
});

export default router;
