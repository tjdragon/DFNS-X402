import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const signer = new AsymmetricKeySigner({
        credId: process.env.DFNS_CRED_ID!,
        privateKey: process.env.DFNS_PRIVATE_KEY!,
    });

    const dfnsApi = new DfnsApiClient({
        orgId: process.env.DFNS_ORG_ID!,
        authToken: process.env.DFNS_AUTH_TOKEN!,
        baseUrl: process.env.DFNS_API_URL!,
        signer,
    });

    let allWallets: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
        const response: any = await dfnsApi.wallets.listWallets({ query: { paginationToken: pageToken } });
        allWallets.push(...response.items);
        pageToken = response.nextPageToken;
    } while (pageToken);

    const ethereumSepoliaWallets = allWallets.filter(w => w.network === 'EthereumSepolia');
    console.log(JSON.stringify(ethereumSepoliaWallets.map(w => ({ id: w.id, address: w.address, network: w.network })), null, 2));
}

main();
