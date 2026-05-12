# 🤖 DFNS X402 Integration Protocol 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Protocol](https://img.shields.io/badge/protocol-X402-orange.svg)
![Network](https://img.shields.io/badge/network-Ethereum%20Sepolia-lightgrey.svg)
![Status](https://img.shields.io/badge/status-Active-success.svg)

Welcome to the **DFNS X402 Integration Protocol**, a secure infrastructure designed to empower AI agents to perform autonomous micro-payments and seamless transactions. Leveraging DFNS's robust key management and raw signing capabilities, this protocol enables agents to authorize "Pull Payments" via ERC-3009, resulting in gasless, frictionless transactions for end-users.

---

## 📜 The History of X402

The concept of the **X402 Protocol** traces its roots back to the early days of the World Wide Web and the original HTTP specification. 

*   **The Original HTTP 402:** In the HTTP/1.1 standard, the status code `402 Payment Required` was reserved for future use, envisioned as a way to facilitate digital cash and micro-transactions natively within the browser. However, the lack of a standardized digital currency at the time left it largely unimplemented.
*   **The Rise of Web3 & AI Agents:** With the advent of stablecoins (like USDC) and autonomous AI agents capable of surfing the web and interacting with APIs, the dream of native web payments has been resurrected. 
*   **X402 Protocol:** X402 modernizes the original `402 Payment Required` vision. When an AI agent hits a paywall or attempts a premium API call, the server responds with a 402 challenge. The agent then fulfills this challenge by providing a cryptographic signature (the `X-PAYMENT` header) proving authorization to spend funds, bridging the gap between AI autonomy and Web3 settlement.

---

## 🚀 Overview

This repository provides a complete integration guide and reference implementation for platforms hosting AI agents. It demonstrates how to utilize the DFNS API to sign X402 payment requirements on behalf of users, allowing merchants to settle transactions securely on-chain.

### Key Features
*   **🤖 AI Autonomy:** Enable your agents to pay for API calls, digital goods, and services autonomously.
*   **⛽ Gasless Experience:** Users and agents don't need native gas tokens (ETH/MATIC). Merchants act as facilitators, handling gas via ERC-3009.
*   **🔐 Enterprise Security:** Policy-based validation ensures agents cannot exceed daily spending limits or interact with unauthorized contracts.
*   **⚡ Native Stablecoins:** Built for Circle's USDC and other `FiatTokenV2` contracts supporting `ReceiveWithAuthorization`.

---

## 🔄 The Flow: AI Agent Purchasing via X402

Here is a step-by-step breakdown of how the integration works, using an Amazon price monitor agent as an example:

1.  **🎯 Task Delegation:** A customer instructs an AI agent to monitor an item's price on Amazon and purchase it if it falls below a threshold.
2.  **🛒 Purchase Attempt:** The agent detects the target price and makes an API call to Amazon to initiate the buy.
3.  **🛑 HTTP 402 Payment Required:** Amazon responds with an `HTTP 402` status code and a Payment Requirement (amount, asset, recipient, nonce).
4.  **🔒 DFNS Signing Request:** The agent forwards this requirement to your internal DFNS-powered endpoint.
5.  **✅ Validation & Signing:** Your backend validates the request against customer policies. If approved, it uses DFNS raw signing to generate an EIP-712 signature for an ERC-3009 `ReceiveWithAuthorization` operation.
6.  **🔑 Signature Returned:** The signed payload is returned to the AI agent.
7.  **💸 Payment Submission:** The agent repeats the API call to Amazon, including the signed payload in the `X-PAYMENT` header.
8.  **🧾 Settlement:** Amazon (the **Payee**) verifies the signature and broadcasts the transaction to the network to finalize the transfer.
9.  **🎉 Success:** The transaction executes on-chain, and the purchase is complete!

---

## 🏗 Architecture

To support this flow, you will build an **X402-Compatible Signing Endpoint** powered by DFNS.

### 1. The Signing Endpoint

Your system exposes an endpoint (e.g., `/api/sign-x402`) that the AI agent calls. Before signing, your system must verify:
*   The AI agent has explicit authorization.
*   The requested `amount` does not exceed the customer's spending limit.
*   The `contract` and `chainId` correspond to allowed stablecoins.

### 2. ERC-3009 Support (EIP-712 Signing)

DFNS generates an EIP-712 signature for the ERC-3009 `ReceiveWithAuthorization` struct. Using DFNS raw signing, this structured data is signed with the customer's managed private key securely stored in DFNS enclaves.

### 3. Payload Delivery

The resulting signature is formatted and sent back to the agent, which then transmits it as the `X-PAYMENT` header to the merchant.

---

## 💻 Example Implementation

We provide a complete TypeScript example in the `src` directory to help you get started quickly:

*   📄 `demo.ts`: End-to-end execution of the X402 flow.
*   ✍️ `dfns-signer.ts`: The DFNS-powered signing logic using EIP-712.
*   🤖 `agent.ts`: The AI agent logic handling the 402 challenge.
*   🏪 `merchant.ts`: The merchant API receiving and settling the payment.

---

## 🛠 Running the Demo

Experience the full end-to-end simulation of the X402 protocol using the DFNS SDK.

### 1. Configure the Environment
Ensure you have the correct credentials set up. A `.env` file must be present with the following variables:
```env
DFNS_API_URL=
DFNS_ORG_ID=
DFNS_CRED_ID=
DFNS_PRIVATE_KEY=
DFNS_AUTH_TOKEN=
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Simulation
Execute the demo script to watch the AI Agent, Merchant, and DFNS Signer interact in real-time:
```bash
npm start
```
> **Note:** This runs `ts-node src/demo.ts` under the hood, initializing the DFNS signer, polling the mock merchant, handling the HTTP 402 challenge, generating the EIP-712 signature over the network, and verifying the on-chain settlement.

---

## 🌐 Sepolia Demo Details

The current implementation is configured to run on **Ethereum Sepolia** to utilize funded DFNS wallets and demonstrate real on-chain settlement.

*   **Network**: Ethereum Sepolia (Chain ID: `11155111`)
*   **USDC Contract**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

**RESULT**: [https://sepolia.etherscan.io/tx/0x096fd4f34278ede9c4e613cca62bcc7f859433cf42ac3f6f00dba0f24c9f1a70](https://sepolia.etherscan.io/tx/0x096fd4f34278ede9c4e613cca62bcc7f859433cf42ac3f6f00dba0f24c9f1a70)

### On-Chain Roles & Settlement

To satisfy **ERC-3009** security requirements, the settlement flow is strictly defined:

*   **Payer (Customer)**: The customer's DFNS wallet **Signs** the payment authorization (EIP-712). Must hold a testnet USDC balance.
*   **Payee (Merchant)**: The merchant's DFNS wallet **Broadcasts** the transaction to the network.
*   **Gas Fees**: The **Merchant** (Payee) acts as the Facilitator and pays the gas fees for the `receiveWithAuthorization` call. This is enforced by the USDC contract (`msg.sender == payee`).

### 💡 Rationale: Why the Merchant Pays Gas?

In the X402 protocol, the Merchant (Payee) is responsible for broadcasting the transaction and paying the gas fees. 

1.  **Technical Security:** ERC-3009 requires `msg.sender == to`. Since the Merchant is the payee, they are the only entity authorized to execute the settlement.
2.  **UX Magic:** By handling the gas, the Merchant provides a seamless experience for AI Agents. Agents only need to hold the asset being spent (USDC) and provide a signature—no native gas tokens required!
3.  **Settlement Guarantee:** The Merchant ensures the transaction is submitted with a competitive gas price, guaranteeing settlement. This treats gas fees as a standard operational cost for the Merchant, akin to traditional credit card processing fees.
