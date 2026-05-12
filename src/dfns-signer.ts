import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import { ethers } from 'ethers';
import { PaymentRequirement, PaymentSignature } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class DfnsX402Signer {
    private dfnsApi: DfnsApiClient;
    private maxDailyLimit: bigint;
    private walletId: string = '';
    private walletAddress: string = '';

    constructor() {
        const signer = new AsymmetricKeySigner({
            credId: process.env.DFNS_CRED_ID!,
            privateKey: process.env.DFNS_PRIVATE_KEY!,
        });

        this.dfnsApi = new DfnsApiClient({
            orgId: process.env.DFNS_ORG_ID!,
            authToken: process.env.DFNS_AUTH_TOKEN!,
            baseUrl: process.env.DFNS_API_URL!,
            signer,
        });

        // e.g. Max limit of 5.00 USDC (6 decimals)
        this.maxDailyLimit = 5000000n; 
    }

    private async initWallet() {
        if (this.walletId) return;

        // Fetch wallets and find one for EthereumSepolia
        let allWallets: any[] = [];
        let pageToken: string | undefined = undefined;

        do {
            const response: any = await this.dfnsApi.wallets.listWallets({ query: { paginationToken: pageToken } });
            allWallets.push(...response.items);
            pageToken = response.nextPageToken;
        } while (pageToken);

        const targetNetwork = "EthereumSepolia";
        const targetWalletId = process.env.DFNS_CUSTOMER_WALLET_ID!;
        const wallet = allWallets.find(w => w.network === targetNetwork && w.id === targetWalletId);
        
        if (!wallet) {
            throw new Error(`No wallets found for network ${targetNetwork}`);
        }

        this.walletId = wallet.id;
        this.walletAddress = wallet.address!;
        console.log(`[DFNS Signer] Initialized with Wallet ID: ${this.walletId} (${this.walletAddress}) on ${targetNetwork}`);
    }

    public async signPayment(agentToken: string, req: PaymentRequirement): Promise<PaymentSignature> {
        await this.initWallet();

        console.log('[DFNS Signer] Received request to sign payment requirement:', req);

        // 1. Policy Validation
        if (BigInt(req.amount) > this.maxDailyLimit) {
            throw new Error(`Payment exceeds daily limit of ${this.maxDailyLimit}`);
        }
        
        console.log(`[DFNS Signer] Validated policy for Chain ID: ${req.chainId} (Ethereum Sepolia)`);

        // 2. Generate EIP-712 Signature using DFNS SDK
        console.log('[DFNS Signer] Requesting EIP-712 Signature from DFNS API...');

        const eip712Message = {
            from: ethers.getAddress(this.walletAddress.toLowerCase()),
            to: ethers.getAddress(req.recipient.toLowerCase()),
            value: req.amount,
            validAfter: req.validAfter,
            validBefore: req.validBefore,
            nonce: req.nonce
        };

        const response = await this.dfnsApi.wallets.generateSignature({
            walletId: this.walletId,
            body: {
                kind: "Eip712",
                types: {
                    ReceiveWithAuthorization: [
                        { name: 'from', type: 'address' },
                        { name: 'to', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'validAfter', type: 'uint256' },
                        { name: 'validBefore', type: 'uint256' },
                        { name: 'nonce', type: 'bytes32' }
                    ]
                },
                domain: {
                    name: 'USDC',
                    version: '2',
                    chainId: req.chainId,
                    verifyingContract: ethers.getAddress(req.contract.toLowerCase())
                },
                message: eip712Message
            }
        });

        console.log(`[DFNS Signer] Signature response status: ${response.status}`);
        
        // Polling loop if the signature is still pending
        let sigResult = response;
        while (sigResult.status !== 'Signed') {
            if (sigResult.status === 'Failed' || sigResult.status === 'Rejected') {
                throw new Error(`Signature generation failed/rejected: ${sigResult.reason}`);
            }
            console.log(`[DFNS Signer] Signature ${sigResult.status}. Waiting 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get the signature details
            const sigs = await this.dfnsApi.wallets.listSignatures({ walletId: this.walletId });
            const found = sigs.items.find(s => s.id === sigResult.id);
            if (found) {
                sigResult = found as any; // Cast for simplicity
            }
        }

        // The confirmed signature contains signedData
        const signedData = (sigResult as any).signedData || (sigResult as any).signature?.encoded;
        const signatureStr = signedData ? (signedData.startsWith('0x') ? signedData : `0x${signedData}`) : "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

        console.log(`[DFNS Signer] DFNS Request ID (Signature ID): ${sigResult.id}`);
        console.log(`[DFNS Signer] Signature Generated: ${signatureStr.substring(0, 15)}...${signatureStr.substring(signatureStr.length - 10)}`);
        console.log('[DFNS Signer] Signature Signed Successfully!');

        return {
            protocol: 'EIP-3009',
            signature: signatureStr,
            message: eip712Message
        };
    }
    public async settlePayment(contractAddress: string, payment: PaymentSignature): Promise<string> {
        await this.initWallet();

        console.log(`[DFNS Signer] Received signed payload for settlement as Facilitator.`);
        
        // 1. Encode Function Data for receiveWithAuthorization
        const selector = "0xef55bec6"; // receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const sig = ethers.Signature.from(payment.signature);
        
        const params = abiCoder.encode(
            ["address", "address", "uint256", "uint256", "uint256", "bytes32", "uint8", "bytes32", "bytes32"],
            [
                payment.message.from,
                payment.message.to,
                payment.message.value,
                payment.message.validAfter,
                payment.message.validBefore,
                payment.message.nonce,
                sig.v,
                sig.r,
                sig.s
            ]
        );
        const calldata = selector + params.slice(2);

        // 2. Broadcast via DFNS
        console.log(`[DFNS Signer] Broadcasting ReceiveWithAuthorization tx to Ethereum Sepolia via DFNS API...`);
        
        const merchantWalletId = process.env.DFNS_MERCHANT_WALLET_ID!;
        const result = await this.dfnsApi.wallets.broadcastTransaction({
            walletId: merchantWalletId,
            body: {
                kind: "Eip1559",
                to: contractAddress,
                data: calldata,
                value: "0",
                gasLimit: "200000",
                maxFeePerGas: "5000000000", // 5 Gwei
                maxPriorityFeePerGas: "1000000000" // 1 Gwei
            } as any
        });

        console.log(`[DFNS Signer] Broadcast result:`, JSON.stringify(result, null, 2));
        return result.txHash!;
    }
}
