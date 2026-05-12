export interface PaymentRequirement {
    amount: string;
    asset: string;
    chainId: number;
    recipient: string;
    contract: string;
    nonce: string;
    validAfter: number;
    validBefore: number;
}

export interface PaymentSignature {
    protocol: string;
    signature: string;
    message: any;
}
