import { readBalances } from './src/balanceService';

async function main(): Promise<void> {
    const walletAddress = '0x7bfee91193d9df2ac0bfe90191d40f23c773c060';

    const tokenBalances = await readBalances(walletAddress, 42161);

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
