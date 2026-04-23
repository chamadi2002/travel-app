import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all packages
router.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM packages');
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new package
router.post('/', async (req, res) => {
    const { name, destination, price, duration, slots, status } = req.body;
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO packages (name, destination, price, duration, slots, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, destination, price, duration, slots, status || 'available']
        );
        conn.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update package
router.put('/:id', async (req, res) => {
    const { name, destination, price, duration, slots, status } = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.query(
            'UPDATE packages SET name=?, destination=?, price=?, duration=?, slots=?, status=? WHERE id=?',
            [name, destination, price, duration, slots, status, req.params.id]
        );
        conn.release();
        res.json({ id: req.params.id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE package
router.delete('/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM packages WHERE id=?', [req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;