import { DfnsX402Signer } from './dfns-signer';
import { MerchantAPI } from './merchant';

export class AIAgent {
    constructor(
        private dfnsSigner: DfnsX402Signer,
        private merchant: MerchantAPI
    ) {}

    public async executeTask() {
        console.log("\n--- AI Agent Task Started ---");
        console.log("[Agent] Checking Amazon for target item price...");

        // Simulate agent making an API call to Amazon
        let response = await this.merchant.purchaseItem("amzn-item-123");

        if (response.status === 402) {
            console.log("[Agent] Received HTTP 402 Payment Required.");
            console.log("[Agent] Payment Requirement details:", response.paymentRequirement);

            // Forward to DFNS Endpoint for signing
            console.log("[Agent] Forwarding requirement to DFNS Signer...");
            const authKey = "agent-auth-token-123";
            const signaturePayload = await this.dfnsSigner.signPayment(authKey, response.paymentRequirement);

            // Encode for HTTP Header
            const xPaymentHeader = Buffer.from(JSON.stringify(signaturePayload)).toString('base64');
            console.log(`[Agent] Received signature from DFNS. Formatted X-PAYMENT header.`);

            // Retry Purchase
            console.log("[Agent] Retrying purchase with X-PAYMENT header...");
            response = await this.merchant.purchaseItem("amzn-item-123", xPaymentHeader, this.dfnsSigner);

            if (response.status === 200) {
                console.log("[Agent] Success!", response.message);
            } else {
                console.log("[Agent] Failed to purchase:", response.error);
            }
        } else {
            console.log("[Agent] Unexpected response:", response);
        }
        
        console.log("--- AI Agent Task Completed ---\n");
    }
}
