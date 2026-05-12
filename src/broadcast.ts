import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Configuration
    const RPC_URL = "https://sepolia.base.org";
    const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    // Get parameters from command line
    const privateKey = process.argv[2];
    const calldata = process.argv[3];

    if (!privateKey || !calldata) {
        console.error("Usage: npx ts-node src/broadcast.ts <PRIVATE_KEY> <CALLDATA>");
        process.exit(1);
    }

    try {
        console.log("Connecting to Base Sepolia...");
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log(`Broadcasting from: ${wallet.address}`);
        console.log(`To Contract: ${USDC_CONTRACT}`);

        const tx = await wallet.sendTransaction({
            to: USDC_CONTRACT,
            data: calldata,
            value: 0
        });

        console.log("\nTransaction Sent!");
        console.log(`Hash: ${tx.hash}`);
        console.log(`View on BaseScan: https://sepolia.basescan.org/tx/${tx.hash}`);

        console.log("\nWaiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`Confirmed in block: ${receipt?.blockNumber}`);
        console.log("Status: Success ✅");

    } catch (error: any) {
        console.error("\nBroadcast Failed ❌");
        console.error(error.message);
    }
}

main();
