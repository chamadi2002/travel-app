import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM expenses ORDER BY date DESC');
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { date, category, description, amount, notes } = req.body;
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO expenses (date, category, description, amount, notes) VALUES (?, ?, ?, ?, ?)',
            [date, category, description, amount, notes]
        );
        conn.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { date, category, description, amount, notes } = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.query(
            'UPDATE expenses SET date=?, category=?, description=?, amount=?, notes=? WHERE id=?',
            [date, category, description, amount, notes, req.params.id]
        );
        conn.release();
        res.json({ id: req.params.id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;