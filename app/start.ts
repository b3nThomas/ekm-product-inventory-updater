import * as colors from 'colors';
import * as parseCSV from 'csv-parse';
import * as ProgressBer from 'progress';
import * as fs from 'fs';
import * as path from 'path';
import { EKMClient } from './EKMClient';

console.log(colors.cyan.bold('⚠︎ Starting EKM Product Inventory Updater...\n'));
const ekmClient = new EKMClient();

(async () => {
    let csv;
    try {
        csv = fs.readFileSync(path.resolve('app', 'data.csv'), { encoding: 'utf-8' }); // tslint:disable-line
    } catch (err) {
        console.log(colors.red('✖ ︎Unable to locate ./app/data.csv file. See README.md. Aborting...\n'));
        process.exit(1);
    }
    parseCSV(csv, { columns: true }, async (err, output) => {
        if (err) {
            console.error(colors.red('✖︎ Error parsing data.csv. Please retry. Aborting...\n'));
            return process.exit(1);
        }

        console.log(colors.yellow.bold(`⚠︎ ${output.length} products to update\n`));

        const throttle = 10;
        const promises = [];
        const bar = new ProgressBer(colors.magenta.bold('⚙︎ :current / :total :bar :percent (:elapseds)'), { total:  output.length, width: 50 });

        for (const entry of output) {
            if (promises.length === throttle) {
                await Promise.all(promises);
                promises.length = 0;
            }

            if (!entry.ItemID || !entry.Quantity) {
                console.error(colors.red('✖︎ Invalid product entry found. Skipping...'));
                console.error(colors.red(entry));
                bar.tick();
                continue;
            }

            promises.push(new Promise(async (resolve, _reject) => {
                await ekmClient.setProductStock(entry.ItemID, entry.Quantity);
                bar.tick();
                if (bar.complete) {
                    console.log(colors.green.bold('\n✔  All done! 🍻\n'));
                }
                return resolve();
            }));
        }
    });
})();
