import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register (Usually for initial setup or admin creating other admins)
router.post('/register', async (req, res) => {
  const { email, password, role, name } = req.body;

  try {
    // Check if user exists
    const userCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert User
    const newUser = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, role || 'member']
    );
    
    // If it's a member, you might want to link/create a member profile here too
    // For now, we just create the login user

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Fetch associated member profile if exists
    let memberId = null;
    if (user.role === 'member') {
        const memberRes = await query('SELECT id, name, mc_id FROM members WHERE user_id = $1', [user.id]);
        if (memberRes.rows[0]) memberId = memberRes.rows[0];
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        memberProfile: memberId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Current User
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await query('SELECT id, email, role FROM users WHERE id = $1', [req.user?.id]);
    const user = userRes.rows[0];
    
    // Get Member details if applicable
    let memberData = null;
    const memRes = await query('SELECT * FROM members WHERE user_id = $1', [user.id]);
    if (memRes.rows.length > 0) memberData = memRes.rows[0];

    res.json({ ...user, member: memberData });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;