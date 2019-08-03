import axios from 'axios';
import * as colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';

export interface EKMAuth {
    endpoint: string;
    key: string;
}

export class EKMClient {
    private auth: EKMAuth;

    constructor() {
        this.getAuth();
    }

    private getAuth(): void {
        let authFile;
        try {
            authFile = fs.readFileSync(path.resolve('app', 'auth.json'), { encoding: 'utf-8' });
            authFile = JSON.parse(authFile);
            console.log(authFile);
        } catch (err) {
            console.log(colors.red('Unable to find ./app/auth.json. Please see README.md. Aborting...\n'));
            return process.exit(1);
        }
        if (!authFile.endpoint || !authFile.key) {
            console.log(colors.red('./app/auth.json is incorrectly configured. Please see README.md. Aborting...\n'));
            return process.exit(1);
        }
        this.auth = {
            endpoint: authFile.endpoint,
            key: authFile.endpoint
        }
    }

    public async getProducStock(itemId: string): Promise<any> {
        // http://publicapi.30.ekm.net/v1.1/publicapi.asmx?op=GetProductStock
        const xmlTemplate = `
            <?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                <soap:Body>
                    <GetProductStock xmlns="http://publicapi.ekmpowershop.com/">
                        <GetProductStockRequest>
                            <APIKey>${this.auth.key}</APIKey>
                            <ProductCode>${itemId}</ProductCode>
                        </GetProductStockRequest>
                    </GetProductStock>
                </soap:Body>
            </soap:Envelope>
        `;
        try {
            const res = await axios.post(this.auth.endpoint, xmlTemplate);
            console.log(res);
            return res;
        } catch (err) {
            console.log(colors.red('getStockCount request failed'), itemId);
            console.error(err);
        }
    }

    // public async setProductStock(itemId: string, stockCount: number) {
    //     // http://publicapi.30.ekm.net/v1.1/publicapi.asmx?op=SetProductStock

    // }
}
