import express from 'express';
import { readBalances } from './src/balanceService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/balances/:address/:chainId', async (req, res) => {
    try {
        const { address, chainId } = req.params;

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'Неверный формат адреса кошелька'
            });
        }

        const chainIdNum = parseInt(chainId);
        if (isNaN(chainIdNum)) {
            return res.status(400).json({
                error: 'Неверный формат chainId'
            });
        }

        console.log(`Получен запрос на чтение балансов: адрес=${address}, сеть=${chainIdNum}`);

        const balances = await readBalances(address, chainIdNum);

        res.json({
            walletAddress: address,
            chainId: chainIdNum,
            balances: balances,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({
            error: 'Внутренняя ошибка сервера'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

export default app;
