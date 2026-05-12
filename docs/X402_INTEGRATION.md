# DFNS X402 Integration Guide

## Overview

DFNS provides a secure, HSM-backed infrastructure for implementing the **X402 Protocol**. This allows your AI agents to perform autonomous micro-payments while you maintain full control over spending policies and security.

By leveraging DFNS as a **Signer** and **Facilitator**, you can enable "Gasless" transactions for your users, where DFNS handles the blockchain interaction and gas fees, while the user only provides an off-chain signature.

---

## Architecture

The integration consists of three main components interacting via the X402 standard:

1.  **AI Agent**: Requests resources and handles the 402 Payment Required challenge.
2.  **DFNS Signer**: Validates the payment against your policies and generates an EIP-712/3009 signature.
3.  **DFNS Facilitator**: Receives the signed payload from the merchant and settles it on-chain.

![x402 Flow](flow.puml)

---

## Integration Steps

### 1. Configure Spending Policies

Before your AI agents can start spending, you must define policies in the DFNS Dashboard.
Example Policy:
- **Max Spend**: $5.00 USDC per day.
- **Allowed Assets**: USDC (Ethereum, Base, Solana).
- **Whitelisted Recipients**: OpenAI, Anthropic, etc.

### 2. Implementing the Signer Endpoint

Your AI agent should call the DFNS Signer whenever it encounters a `402 Payment Required` response.

**Request:**
```http
POST /v1/x402/sign
Content-Type: application/json
Authorization: Bearer <YOUR_API_TOKEN>

{
  "requirement": {
    "amount": "0.05",
    "asset": "USDC",
    "chainId": 8453,
    "recipient": "0xMerchantAddress...",
    "contract": "0xUSDCAddress...",
    "nonce": "unique-session-id"
  }
}
```

**Response:**
```json
{
  "paymentSignature": "eyJwcm90b2NvbCI6IkVJUC0zMDA5IiwicGF5bG9hZCI6eyJmcm9tIjo...=="
}
```

### 3. Merchant Settlement

Merchants receive the `X-PAYMENT` header and forward it to the DFNS Facilitator for settlement.

**Merchant Request to DFNS:**
```http
POST /v1/x402/settle
Content-Type: application/json

{
  "signedPayload": "<BASE64_X_PAYMENT_HEADER>"
}
```

---

## Security Best Practices

### Domain Verification
Always ensure the `verifyingContract` in the signing request matches the official USDC or stablecoin addresses on the target chain. DFNS Signer performs this check automatically based on your configuration.

### Idempotency
Use unique `nonce` values for every payment requirement to prevent replay attacks. The X402 protocol mandates unique nonces for each challenge.

### ERC-3009 Support
DFNS supports the `receiveWithSignature` and `transferWithSignature` methods. This allows for atomic "Pull Payments" where the merchant can pull the funds once they have the signature, without the user needing to send a transaction.

---

## Support

For more information, visit [x402.org](https://www.x402.org/) or contact DFNS Support.
