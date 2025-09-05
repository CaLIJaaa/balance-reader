import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export interface TokenInfo {
    name: string;
    address: string;
}

export interface Network {
    name: string;
    chainId: number;
    tokens: TokenInfo[];
}

export interface Config {
    networks: Network[];
}

export interface BalanceInfo {
    address: string;
    name: string;
    symbol: string;
    balance: string;
    rawBalance: string;
}

interface RPCMapping {
    [chainId: number]: string | undefined;
}

let config: Config;
try {
    const configPath = path.join(__dirname, '../web3_config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;
} catch (error) {
    console.error('Ошибка загрузки конфигурации:', (error as Error).message);
    throw error;
}

const rpcMapping: RPCMapping = {
    42161: process.env.ARBITRUM_RPC,    // Arbitrum
    1: process.env.ETHEREUM_RPC,        // Ethereum
};

export async function getTokenBalance(
    provider: ethers.JsonRpcProvider,
    tokenAddress: string,
    walletAddress: string
): Promise<BalanceInfo | null> {
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
        console.error(`Ошибка при чтении баланса токена ${tokenAddress}:`, (error as Error).message);
        return null;
    }
}

export async function readBalances(walletAddress: string, chainId: number): Promise<BalanceInfo[]> {
    console.log(`Чтение балансов для кошелька: ${walletAddress}`);

    const rpcUrl = rpcMapping[chainId];
    if (!rpcUrl) {
        console.error(`RPC URL для сети ${chainId} не найден`);
        return [];
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        const results: BalanceInfo[] = [];

        const ethBalance = await getEthBalance(provider, walletAddress);
        if (ethBalance && parseFloat(ethBalance.balance) > 0) {
            results.push(ethBalance);
        }

        console.log('Сканирование событий Transfer...');
        const tokenAddresses = await scanTransferEvents(provider, walletAddress, chainId);

        console.log(`Найдено ${tokenAddresses.size} уникальных токенов`);

        for (const tokenAddress of tokenAddresses) {
            const balanceInfo = await getTokenBalance(provider, tokenAddress, walletAddress);

            if (balanceInfo) {
                if (parseFloat(balanceInfo.balance) > 0) {
                    results.push(balanceInfo);
                }
            }
        }

        return results;
    } catch (error) {
        console.error('Ошибка при чтении балансов:', (error as Error).message);
        return [];
    }
}

async function scanTransferEvents(
    provider: ethers.JsonRpcProvider,
    walletAddress: string,
    chainId: number
): Promise<Set<string>> {
    const tokenAddresses = new Set<string>();

    try {
        const currentBlock = await provider.getBlockNumber();

        const blocksToScan = Math.min(10000, currentBlock);
        const fromBlock = Math.max(0, currentBlock - blocksToScan);

        console.log(`Сканирование блоков с ${fromBlock} по ${currentBlock}`);

        const transferToFilter = {
            topics: [
                ethers.id("Transfer(address,address,uint256)"),
                null, // from - любой адрес
                ethers.zeroPadValue(walletAddress, 32) // to - наш кошелек
            ],
            fromBlock: fromBlock,
            toBlock: currentBlock
        };

        const [incomingLogs] = await Promise.all([
            provider.getLogs(transferToFilter)]);

        console.log(`Найдено ${incomingLogs.length} входящих Transfer событий`);

        incomingLogs.forEach(log => {
            if (log.address) {
                tokenAddresses.add(log.address.toLowerCase());
            }
        });

        return tokenAddresses;

    } catch (error) {
        console.error('Ошибка при сканировании событий Transfer:', (error as Error).message);

        console.log('Используем fallback к конфигурации токенов');
        return getFallbackTokens(chainId);
    }
}

function getFallbackTokens(chainId: number): Set<string> {
    const fallbackTokens = new Set<string>();

    if (chainId === 42161) { // Arbitrum
        fallbackTokens.add('0x912CE59144191C1204E64559FE8253a0e49E6548'); // ARB
        fallbackTokens.add('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'); // USDC
        fallbackTokens.add('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'); // USDT
        fallbackTokens.add('0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'); // WBTC
        fallbackTokens.add('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'); // WETH
    } else if (chainId === 1) { // Ethereum
        fallbackTokens.add('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'); // USDC
        fallbackTokens.add('0xdAC17F958D2ee523a2206206994597C13D831ec7'); // USDT
        fallbackTokens.add('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'); // WBTC
        fallbackTokens.add('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'); // WETH
        fallbackTokens.add('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'); // UNI
    }

    return fallbackTokens;
}

async function getEthBalance(
    provider: ethers.JsonRpcProvider,
    walletAddress: string
): Promise<BalanceInfo | null> {
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
        console.error('Ошибка при чтении баланса ETH:', (error as Error).message);
        return null;
    }
}
