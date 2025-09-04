const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

const ARBITRUM_RPC = process.env.ARBITRUM_RPC;

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

async function readBalances(walletAddress, tokenAddresses) {
    console.log(`Чтение балансов для кошелька: ${walletAddress}`);

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    try {
        const results = [await getEthBalance(provider, walletAddress)];

        for (const tokenAddress of tokenAddresses) {
            const balanceInfo = await getTokenBalance(provider, tokenAddress, walletAddress);

            if (balanceInfo) {
                results.push(balanceInfo);
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
    const walletAddress = '0x268cBDa30Dd229E5F9b084609a2bb9b73b0f8aaD';
    const tokenAddresses = [
        '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    ];

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const tokenBalances = await readBalances(walletAddress, tokenAddresses);

    console.log(JSON.stringify({ tokenBalances }, null, 2));
}

if (require.main === module) {
    main().catch(console.error);
}