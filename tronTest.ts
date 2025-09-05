import { TronWeb } from 'tronweb';

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: '01'.repeat(32)
});

// TRC20 ABI с основными функциями для чтения информации о токене
const TRC20_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "who", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// Пример использования TRC20 ABI
(async () => {
    try {
        // Адрес USDT в сети TRON
        const usdtAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

        // Создаем контракт
        const contract = await tronWeb.contract(TRC20_ABI, usdtAddress);

        // Получаем информацию о токене
        const name = await contract.name().call();
        const symbol = await contract.symbol().call();
        const decimals = await contract.decimals().call();

        console.log('Информация о токене:');
        console.log('Название:', name);
        console.log('Символ:', symbol);
        console.log('Десятичные знаки:', decimals);

        const exampleAddress = 'TTRMwhxtUdgykYPoeq6eEUKLmj26Y4KtcG';
        const balance = await contract.balanceOf(exampleAddress).call();

        console.log('Баланс (raw):', balance.toString());

        // Правильная обработка BigInt значений
        const balanceNumber = Number(balance);
        const decimalsNumber = Number(decimals);
        const formattedBalance = (balanceNumber / Math.pow(10, decimalsNumber)).toFixed(6);

        console.log('Отформатированный баланс:', formattedBalance);

    } catch (error) {
        console.error('Ошибка:', error);
    }
})();