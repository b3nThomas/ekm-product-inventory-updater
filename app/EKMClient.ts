import axios from 'axios';
import * as colors from 'colors';
import * as convert from 'xml-js';
import * as DOMParser from 'dom-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface EKMAuth {
    endpoint: string;
    key: string;
}

export class EKMClient {
    private auth: EKMAuth;
    private requestHeaders: any = {
        headers: {
            'Accept': 'text/xml',
            'Content-Type': 'text/xml'
        }
    };
    private parser: any = new DOMParser();
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
        // http://publicapi.30.ekm.net/v1.1/publicapi.asmx?op=SetProductStock
        let xmlTemplate: any = `
            <?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                <soap:Body>
                    <SetProductStock xmlns="http://publicapi.ekmpowershop.com/">
                        <SetProductStockRequest>
                            <APIKey>${this.auth.key}</APIKey>
                            <ProductCode>${productCode}</ProductCode>
                            <ProductStock>${stockCount}</ProductStock>
                        </SetProductStockRequest>
                    </SetProductStock>
                </soap:Body>
            </soap:Envelope>
        `.replace(/\n/g, '').trim();
        xmlTemplate = this.parser.parseFromString(xmlTemplate, 'text/xml').rawHTML;

        await axios
            .post(this.auth.endpoint, xmlTemplate, this.requestHeaders)
            .then(res => {
                return convert.xml2js(res.data, { compact: true });
            })
            .catch(err => {
                console.log(colors.red(`setStockCount request failed for item "${productCode}"\n`));
                console.log(err.respone.data);
                this.errors.push(productCode);
                return;
            }
        );
    }

    public getErrors(): string[] {
        return this.errors;
    }
}
