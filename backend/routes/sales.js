import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM sales ORDER BY date DESC');
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { package_id, buyer, date, price, payment } = req.body;
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO sales (package_id, buyer, date, price, payment) VALUES (?, ?, ?, ?, ?)',
            [package_id, buyer, date, price, payment || 'pending']
        );
        conn.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM sales WHERE id=?', [req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/mark-paid', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('UPDATE sales SET payment=? WHERE id=?', ['paid', req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;