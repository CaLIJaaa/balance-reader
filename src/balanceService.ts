import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
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

    const network = config.networks.find(net => net.chainId === chainId);
    if (!network) {
        console.error(`Сеть с chainId ${chainId} не найдена в конфигурации`);
        return [];
    }

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

        for (const token of network.tokens) {
            const balanceInfo = await getTokenBalance(provider, token.address, walletAddress);

            if (balanceInfo) {
                if (parseFloat(balanceInfo.balance) > 0) {
                    results.push(balanceInfo);
                }
            } else {
                console.log(`Ошибка чтения баланса для ${token.name}`);
            }
        }

        return results;
    } catch (error) {
        console.error('Ошибка при чтении балансов:', (error as Error).message);
        return [];
    }
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
