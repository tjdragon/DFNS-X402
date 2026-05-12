import { ethers } from 'ethers';
import { DfnsX402Signer } from './dfns-signer';
import { MerchantAPI } from './merchant';
import { AIAgent } from './agent';

async function main() {
    console.log("=========================================");
    console.log("   DFNS X402 Integration Demo (v2)       ");
    console.log("=========================================\n");

    // 1. Setup DFNS Signer using SDK (configures itself via .env)
    const dfnsSigner = new DfnsX402Signer();

    // 2. Setup Merchant API (e.g. Amazon)
    const amazonAPI = new MerchantAPI();

    // 3. Setup AI Agent
    const agent = new AIAgent(dfnsSigner, amazonAPI);

    // 4. Execute the Agent Task
    await agent.executeTask();
}

main().catch(console.error);
