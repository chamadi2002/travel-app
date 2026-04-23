import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import packagesRoute from './routes/packages.js';
import salesRoute from './routes/sales.js';
import invoicesRoute from './routes/invoices.js';
import expensesRoute from './routes/expenses.js';
import guidesRoute from './routes/guides.js';
import dashboardRoute from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/packages', packagesRoute);
app.use('/api/sales', salesRoute);
app.use('/api/invoices', invoicesRoute);
app.use('/api/expenses', expensesRoute);
app.use('/api/guides', guidesRoute);
app.use('/api/dashboard', dashboardRoute);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
