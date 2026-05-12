import { ethers } from 'ethers';
import { PaymentRequirement } from './types';

export class MerchantAPI {
    private merchantAddress: string;
    private usdcContract: string;
    private chainId: number;

    constructor() {
        this.merchantAddress = process.env.MERCHANT_ADDRESS || '0x847f83ad253a53400619bfd4efa0907f39e40757';
        this.usdcContract = process.env.USDC_CONTRACT_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // USDC on Ethereum Sepolia
        this.chainId = parseInt(process.env.CHAIN_ID || '11155111'); // Ethereum Sepolia

        console.log(`[Merchant] Initialized on Chain ID: ${this.chainId}`);
    }

    public async purchaseItem(itemId: string, xPaymentHeader?: string, facilitator?: any): Promise<any> {
        console.log(`[Merchant] Received purchase request for item ${itemId}`);
        const price = "1000000"; // 1.00 USDC

        if (!xPaymentHeader) {
            console.log(`[Merchant] No X-PAYMENT header found. Returning 402 Payment Required.`);
            const req: PaymentRequirement = {
                amount: price,
                asset: "USDC",
                chainId: this.chainId,
                recipient: this.merchantAddress,
                contract: this.usdcContract,
                nonce: ethers.hexlify(ethers.randomBytes(32)),
                validAfter: 0,
                validBefore: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
            };
            
            return {
                status: 402,
                paymentRequirement: req
            };
        }

        console.log(`[Merchant] X-PAYMENT header found. Verifying...`);
        const payload = JSON.parse(Buffer.from(xPaymentHeader, 'base64').toString('utf-8'));

        if (payload.protocol !== 'EIP-3009') {
            throw new Error('Unsupported protocol');
        }

        // Verify Signature
        const domain = {
            name: 'USDC',
            version: '2',
            chainId: this.chainId,
            verifyingContract: this.usdcContract
        };

        const types = {
            ReceiveWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ]
        };

        const recoveredAddress = ethers.verifyTypedData(domain, types, payload.message, payload.signature);
        
        if (recoveredAddress.toLowerCase() !== payload.message.from.toLowerCase()) {
             return { status: 401, error: "Invalid signature" };
        }

        console.log(`[Merchant] Signature verified! Signer is ${recoveredAddress}`);
        
        if (facilitator) {
            console.log(`[Merchant] Submitting transaction to DFNS Facilitator for REAL Settlement...`);
            const txHash = await facilitator.settlePayment(this.usdcContract, payload);
            return {
                status: 200,
                message: `Successfully purchased item ${itemId}! Transaction Hash: ${txHash}`
            };
        } else {
            // Fallback for demo if no facilitator provided
            console.log(`[Merchant] No facilitator provided. Skipping broadcast.`);
            return {
                status: 200,
                message: `Successfully purchased item ${itemId}! (Verification Only)`
            };
        }
    }
}
