import axios from 'axios';
import * as colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';
import * as xml from 'xml';

export interface EKMAuth {
    endpoint: string;
    key: string;
}

export class EKMClient {
    private auth: EKMAuth;
    private requestHeaders: any = {
        headers: {
            'Accept': 'text/xml',
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPAction': 'http://publicapi.ekmpowershop.com/SetProductStock'
        }
    };
    private errors: string[] = [];

    constructor() {
        this.getAuth();
    }

    private getAuth(): void {
        let authFile;
        try {
            authFile = fs.readFileSync(path.resolve('app', 'auth.json'), { encoding: 'utf-8' });
            authFile = JSON.parse(authFile);
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
            key: authFile.key
        }
        console.log(colors.green.bold('✔ Credentials authorised\n'));
    }

    public async setProductStock(productCode: string, stockCount: number): Promise<any> {
        const xmlTemplate = [
            {
                'soap:Envelope': [
                    {
                        _attr: {
                            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                            'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
                            'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/'
                        }
                    },
                    {
                        'soap:Body': [
                            {
                                SetProductStock: [
                                    {
                                        _attr: {
                                            xmlns: 'http://publicapi.ekmpowershop.com/'
                                        }
                                    },
                                    {
                                        SetProductStockRequest: [
                                            { APIKey: this.auth.key },
                                            { ProductCode: productCode },
                                            { ProductStock: stockCount }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        const xmlEl = xml(xmlTemplate, { declaration: true });
        try {
            // const res = await soapRequest(this.auth.endpoint, this.requestHeaders, xmlTemplate, 5000);
            const res = await axios.post(this.auth.endpoint, xmlEl, this.requestHeaders);
            console.log(res.data);
            return res;
        } catch (err) {
            console.log(colors.green(err));
            this.errors.push(productCode);
            return;
        }
    }

    public getErrors(): string[] {
        return this.errors;
    }
}
