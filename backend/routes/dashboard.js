import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const conn = await pool.getConnection();

        const [revenue] = await conn.query('SELECT SUM(price) as total FROM sales WHERE payment="paid"');
        const [expenses] = await conn.query('SELECT SUM(amount) as total FROM expenses');
        const [outstanding] = await conn.query('SELECT SUM(amount) as total FROM invoices WHERE status!="paid"');
        const [sold] = await conn.query('SELECT COUNT(*) as total FROM sales');

        conn.release();

        const totalRevenue = revenue[0].total || 0;
        const totalExpenses = expenses[0].total || 0;

        res.json({
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            outstanding: outstanding[0].total || 0,
            packagesSold: sold[0].total || 0,
            cashBalance: totalRevenue - totalExpenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;