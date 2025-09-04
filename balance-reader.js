const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

let config;
try {
    const configPath = path.join(__dirname, 'web3_config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Ошибка загрузки конфигурации:', error.message);
    process.exit(1);
}

const rpcMapping = {
    42161: process.env.ARBITRUM_RPC,    // Arbitrum
    1: process.env.ETHEREUM_RPC,        // Ethereum
};

async function getTokenBalance(provider, tokenAddress, walletAddress) {
    try {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        const [balance, decimals, symbol, name] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
            contract.symbol(),
            contract.name()
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);

        return {
            address: tokenAddress,
            name,
            symbol,
            balance: formattedBalance,
            rawBalance: balance.toString()
        };
    } catch (error) {
        console.error(`Ошибка при чтении баланса токена ${tokenAddress}:`, error.message);
        return null;
    }
}

async function readBalances(walletAddress, chainId) {
    console.log(`Чтение балансов для кошелька: ${walletAddress}`);

    const network = config.networks.find(net => net.chainId === chainId);
    if (!network) {
        console.error(`Сеть с chainId ${chainId} не найдена в конфигурации`);
        return [];
    }

    const rpcUrl = rpcMapping[chainId];
    if (!rpcUrl) {
        return [];
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const results = [];

        const ethBalance = await getEthBalance(provider, walletAddress);
        if (ethBalance && parseFloat(ethBalance.balance) > 0) {
            results.push(ethBalance);
        }

        for (const token of network.tokens) {
            const balanceInfo = await getTokenBalance(provider, token.address, walletAddress);

            if (balanceInfo) {
                if (parseFloat(balanceInfo.balance) > 0) {
                    results.push(balanceInfo);
                } else {
                    console.log(`Баланс токена ${token.name} равен 0`);
                }

            } else {
                console.log(`Ошибка`);
            }
            console.log('');
        }

        return results;
    } catch (error) {
        return [];
    }
}

async function getEthBalance(provider, walletAddress) {
    try {
        const balance = await provider.getBalance(walletAddress);
        const formattedBalance = ethers.formatEther(balance);
        return {
            address: '0x0000000000000000000000000000000000000000',
            name: 'Ethereum',
            symbol: 'ETH',
            balance: formattedBalance,
            rawBalance: balance.toString()
        };
    } catch (error) {
        console.error('Ошибка при чтении баланса ETH:', error.message);
        return null;
    }
}

async function main() {
    const walletAddress = '0x7bfee91193d9df2ac0bfe90191d40f23c773c060';

    const tokenBalances = await readBalances(walletAddress, 1);

    tokenBalances.forEach(token => {
        if (token) {
            console.log(`${token.symbol}: ${token.balance} (${token.name})`);
        }
    });

    console.log('\nJSON результат:');
    console.log(JSON.stringify({ tokenBalances }, null, 2));
}

if (require.main === module) {
    main().catch(console.error);
}