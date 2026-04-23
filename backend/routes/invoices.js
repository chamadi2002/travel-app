import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM invoices ORDER BY issue_date DESC');
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { sale_id, customer, package_name, amount, issue_date, due_date, status } = req.body;
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO invoices (sale_id, customer, package_name, amount, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sale_id, customer, package_name, amount, issue_date, due_date, status || 'unpaid']
        );
        conn.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/mark-paid', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('UPDATE invoices SET status=?, paid_date=NOW() WHERE id=?', ['paid', req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM invoices WHERE id=?', [req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;