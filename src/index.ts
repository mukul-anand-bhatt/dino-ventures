
import express from 'express';
import walletRoutes from './routes/wallet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', walletRoutes);

app.get('/health', (req, res) => {
    res.send('Healthy');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
