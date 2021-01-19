import axios from 'axios';
import * as colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

interface EKMAuth {
    username: string;
    password: string;
}

export class EKMClient {
    private auth: EKMAuth;
    private browser: puppeteer.Browser;
    private loginUrl: string = 'https://www.ekm.com/login';
    private loginFrameSelector: string = 'iframe.login-form-frame';
    private stocksUrl: string =
        'https://youraccount.30.ekm.net/ekmps/shops/aim/#/productsByCategory/All';
    private stocksPage: puppeteer.Page;
    private searchInputSelector: string = 'div.search input.search-field';
    private productCodeTDSelector: string = 'td.ProdCode';
    private stockTDSelector: string = 'td.Stock';
    private stockInputSelector: string = 'td.Stock input';
    private priceTDSelector: string = 'td.rightPriceCol';
    private priceInputSelector: string = 'td.rightPriceCol input';
    private updates: object[] = [];
    private errors: object[] = [];

    constructor() {
        this.getAuth();
    }

    private getAuth(): void {
        let authFile;
        try {
            authFile = fs.readFileSync(path.resolve('app', 'auth.json'), { encoding: 'utf-8' });
            authFile = JSON.parse(authFile);
        } catch (err) {
            console.log(
                colors.red.bold(
                    'Unable to find ./app/auth.json. Please see README.md. Aborting...\n'
                )
            );
            return process.exit(1);
        }
        if (!authFile.username || !authFile.password) {
            console.log(
                colors.red.bold(
                    './app/auth.json is incorrectly configured. Please see README.md. Aborting...\n'
                )
            );
            return process.exit(1);
        }
        this.auth = {
            username: authFile.username,
            password: authFile.password,
        };
        console.log(colors.green.bold('✔ Credentials authorised\n'));
    }

    public async startBrowser(): Promise<void> {
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { height: 640, width: 1800 },
        });
        console.log(colors.cyan.bold('✔ Browser started\n'));
    }

    public async stopBrowser(): Promise<void> {
        await this.browser.close();
        console.log(colors.cyan.bold('\n✔ Browser stopped'));
    }

    public async signIn(): Promise<void> {
        console.log(colors.yellow.bold('★ Signing in to EKM...\n'));
        const page = await this.browser.newPage();

        // Get login page
        await page.goto(this.loginUrl);

        // Get URL of the login iframe
        await page.waitForSelector(this.loginFrameSelector);
        const frame = await page.$(this.loginFrameSelector);
        const frameUrl: any = await (await frame.getProperty('src')).jsonValue();

        // Scrape iframe conent directly to bypass Cross Origin stuff
        let { data } = await axios.get(frameUrl);

        // Replace the redirect code
        data = data.replace(
            "if (window.top === window) window.location.href = 'https://www.ekm.com/login.asp';",
            ''
        );

        // Write html to file and navigate to it
        fs.writeFileSync('./form.html', data);
        await page.goto(`file://${path.resolve('./form.html')}`);

        // Sign in!
        await page.type('input[name="form_username"]', this.auth.username);
        await page.type('input[name="form_password"]', this.auth.password);
        await page.click('button[type="submit"]');

        try {
            await page.waitForSelector('#ordersAnalytics', { visible: true, timeout: 90e3 });
            console.log(colors.green.bold('✔ Sign in successful\n'));
            fs.unlinkSync('./form.html');
        } catch (err) {
            console.log(
                colors.red.bold('Unable to sign in to EKM. Please see README.md. Aborting...\n')
            );
            process.exit(1);
        }
    }

    public async updateProduct(productId: string, quantity: string, price: string): Promise<void> {
        try {
            if (!this.stocksPage) {
                this.stocksPage = await this.browser.newPage();
                await this.stocksPage.goto(this.stocksUrl);
                await this.stocksPage.waitForSelector(this.searchInputSelector, {
                    visible: true,
                    timeout: 20e3,
                });
            }
            await this.stocksPage.click(this.searchInputSelector);
            for (let i = 0; i < 30; i++) {
                await this.stocksPage.keyboard.press('Backspace');
            }
            await this.stocksPage.type(this.searchInputSelector, productId);
            await this.stocksPage.waitForTimeout(5e3);
            if (await this.stocksPage.$('.no-products.fadeIn')) {
                const err = { name: 'No products found for this ID' };
                this.logError({ productId, err });
                return;
            }

            const ids = [];
            for (const product of await this.stocksPage.$$(this.productCodeTDSelector)) {
                const id = await this.stocksPage.evaluate((el) => el.textContent, product);
                ids.push(id);
            }

            const rowIndex = ids.findIndex((id) => id === productId);
            console.log('rowIndex', rowIndex);
            console.log('ids[rowIndex]', ids[rowIndex]);

            await this.stocksPage.waitForSelector(this.stockInputSelector, { timeout: 10e3 });
            if ((await this.stocksPage.$$(this.stockInputSelector)).length > 1) {
                const err = { name: 'Multiple products found for this ID' };
                this.logError({ productId, err });
                return;
            }
            await this.updateField(this.stockTDSelector, this.stockInputSelector, quantity);
            await this.updateField(this.priceTDSelector, this.priceInputSelector, price);
            this.updates.push({ productId, quantity, price });
        } catch (err) {
            this.logError({ productId, err });
        }
    }

    private async updateField(
        tdSelector: string,
        inputSelector: string,
        value: string
    ): Promise<void> {
        await this.stocksPage.click(tdSelector);
        await this.stocksPage.click(inputSelector);
        for (let i = 0; i < 10; i++) {
            await this.stocksPage.keyboard.press('Backspace');
        }

        await this.stocksPage.type(inputSelector, value);
        await this.stocksPage.keyboard.press('Enter');
        await this.stocksPage.waitForTimeout(4e3);
    }

    public getUpdates(): object[] {
        return this.updates;
    }

    public logError(error: object): void {
        this.errors.push(error);
    }

    public getErrors(): object[] {
        return this.errors;
    }
}
