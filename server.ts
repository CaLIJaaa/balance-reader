import express from 'express';
import { readBalances } from './src/balanceService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/balances', async (req, res) => {
    try {
        const { address, chainId } = req.body;

        if (!address || !chainId) {
            return res.status(400).json({
                error: 'Требуются поля: address и chainId',
                required: ['address', 'chainId']
            });
        }

        if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'Неверный формат адреса кошелька',
                details: 'Адрес должен быть строкой в формате 0x...'
            });
        }

        const chainIdNum = typeof chainId === 'number' ? chainId : parseInt(chainId);
        if (isNaN(chainIdNum) || chainIdNum <= 0) {
            return res.status(400).json({
                error: 'Неверный формат chainId',
                details: 'chainId должен быть положительным числом'
            });
        }

        console.log(`Получен запрос на чтение балансов: адрес=${address}, сеть=${chainIdNum}`);

        const balances = await readBalances(address, chainIdNum);

        res.json({
            success: true,
            data: {
                walletAddress: address,
                chainId: chainIdNum,
                balances: balances,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера',
            message: error instanceof Error ? error.message : 'Неизвестная ошибка'
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
