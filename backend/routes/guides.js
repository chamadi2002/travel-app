import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM guides');
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { name, email, phone, commission, assigned_packages } = req.body;
    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO guides (name, email, phone, commission, assigned_packages) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, commission, assigned_packages]
        );
        conn.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { name, email, phone, commission, assigned_packages } = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.query(
            'UPDATE guides SET name=?, email=?, phone=?, commission=?, assigned_packages=? WHERE id=?',
            [name, email, phone, commission, assigned_packages, req.params.id]
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
        await conn.query('DELETE FROM guides WHERE id=?', [req.params.id]);
        conn.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;