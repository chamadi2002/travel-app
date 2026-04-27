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
    const { date, category, description, amount, notes, package_id } = req.body;
    try {
        const conn = await pool.getConnection();
        const pkgId = package_id ? parseInt(package_id) : null;
        const [result] = await conn.query(
            'INSERT INTO expenses (date, category, description, amount, notes, package_id) VALUES (?, ?, ?, ?, ?, ?)',
            [date, category, description, amount, notes, pkgId]
        );
        conn.release();
        res.json({ id: result.insertId, date, category, description, amount, notes, package_id: pkgId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { date, category, description, amount, notes, package_id } = req.body;
    try {
        const conn = await pool.getConnection();
        const pkgId = package_id ? parseInt(package_id) : null;
        await conn.query(
            'UPDATE expenses SET date=?, category=?, description=?, amount=?, notes=?, package_id=? WHERE id=?',
            [date, category, description, amount, notes || null, pkgId, req.params.id]
        );
        conn.release();
        res.json({ id: req.params.id, date, category, description, amount, notes, package_id: pkgId });
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
