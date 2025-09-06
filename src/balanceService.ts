import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';
import * as fs from 'fs';
import * as path from 'path';

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

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
    42161: "https://rpc.poolz.finance/arbitrum",    // Arbitrum
    1: "https://eth.llamarpc.com",                  // Ethereum
    728126428: "https://api.trongrid.io"            // TRON Mainnet
};

const TRON_NETWORK = 728126428

function getNetworkType(chainId: number): 'EVM' | 'TVM' {
    return chainId === TRON_NETWORK ? 'TVM' : 'EVM';
}

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

export async function getTronTokenBalance(
    tronWeb: any,
    tokenAddress: string,
    walletAddress: string
): Promise<BalanceInfo | null> {
    try {
        const contract = await tronWeb.contract(TRC20_ABI, tokenAddress);

        const [balance, decimals, symbol, name] = await Promise.all([
            contract.balanceOf(walletAddress).call(),
            contract.decimals().call(),
            contract.symbol().call(),
            contract.name().call()
        ]);

        const balanceNumber = Number(balance);
        const decimalsNumber = Number(decimals);
        const formattedBalance = (balanceNumber / Math.pow(10, decimalsNumber)).toString();

        return {
            address: tokenAddress,
            name,
            symbol,
            balance: formattedBalance,
            rawBalance: balance.toString()
        };
    } catch (error) {
        console.error(`Ошибка при чтении баланса TRON токена ${tokenAddress}:`, (error as Error).message);
        return null;
    }
}

async function getTrxBalance(
    tronWeb: any,
    walletAddress: string
): Promise<BalanceInfo | null> {
    try {
        const balance = await tronWeb.trx.getBalance(walletAddress);
        const formattedBalance = (balance / 1000000).toString(); // TRX имеет 6 десятичных знаков

        return {
            address: 'TRX',
            name: 'TRON',
            symbol: 'TRX',
            balance: formattedBalance,
            rawBalance: balance.toString()
        };
    } catch (error) {
        console.error('Ошибка при чтении баланса TRX:', (error as Error).message);
        return null;
    }
}

export async function readTronBalances(walletAddress: string, chainId: number): Promise<BalanceInfo[]> {
    console.log(`Чтение TRON балансов для кошелька: ${walletAddress}`);

    const network = config.networks.find(net => net.chainId === chainId);
    if (!network) {
        console.error(`TRON сеть с chainId ${chainId} не найдена в конфигурации`);
        return [];
    }

    const rpcUrl = rpcMapping[chainId];
    if (!rpcUrl) {
        console.error(`RPC URL для TRON сети ${chainId} не найден`);
        return [];
    }

    const tronWeb = new TronWeb({
        fullHost: rpcUrl,
        privateKey: '01'.repeat(32)
    });

    try {
        const results: BalanceInfo[] = [];

        const trxBalance = await getTrxBalance(tronWeb, walletAddress);
        if (trxBalance && parseFloat(trxBalance.balance) > 0) {
            results.push(trxBalance);
        }

        for (const token of network.tokens) {
            const balanceInfo = await getTronTokenBalance(tronWeb, token.address, walletAddress);

            if (balanceInfo) {
                if (parseFloat(balanceInfo.balance) > 0) {
                    results.push(balanceInfo);
                }
            } else {
                console.log(`Ошибка чтения баланса для TRON токена ${token.name}`);
            }
        }

        return results;
    } catch (error) {
        console.error('Ошибка при чтении TRON балансов:', (error as Error).message);
        return [];
    }
}

export async function readBalances(walletAddress: string, chainId: number): Promise<BalanceInfo[]> {
    console.log(`Чтение балансов для кошелька: ${walletAddress}`);

    const networkType = getNetworkType(chainId);

    if (networkType === 'TVM') {
        return readTronBalances(walletAddress, chainId);
    }

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
