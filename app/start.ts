import * as colors from 'colors';
import * as parseCSV from 'csv-parse';
import * as ProgressBar from 'progress';
import * as fs from 'fs-extra';
import * as path from 'path';
import { EKMClient } from './EKMClient';

console.log(colors.magenta.bold('★ Starting EKM Product Inventory Updater...\n'));
const ekmClient = new EKMClient();

(async () => {
    const start = new Date().getTime();
    let csv;
    try {
        csv = fs.readFileSync(path.resolve('app', 'data.csv'), { encoding: 'utf-8' }); // tslint:disable-line
    } catch (err) {
        console.log(colors.red('✘ Unable to locate ./app/data.csv file. See README.md. Aborting...\n'));
        process.exit(1);
    }
    parseCSV(csv, { columns: true }, async (err, output) => {
        if (err) {
            console.error(colors.red('✖︎ Error parsing data.csv. Please retry. Aborting...\n'));
            return process.exit(1);
        }

        console.log(colors.yellow.bold(`★ ${output.length} products to update...\n`));

        const threads = 1;
        const throttle = 1250;
        const promises = [];
        const bar = new ProgressBar(colors.magenta.bold('★ :current / :total :bar :percent (:elapseds)'), { total:  output.length, width: 75 });

        for (const entry of output) {
            if (promises.length === threads) {
                await Promise.all(promises);
                promises.length = 0;
            }

            if (!('ItemID' in entry) || !('Stock' in entry)) {
                console.error(colors.red('✘ Invalid product entry found. Skipping...'));
                console.error(colors.red(entry));
                bar.tick();
                continue;
            }

            promises.push(new Promise(async (resolve, _reject) => {
                await ekmClient.setProductStock(entry.ItemID, entry.Stock);
                bar.tick();
                if (bar.complete) {
                    const tag = `${new Date().toISOString()}.json`.replace(/:/g, '');
                    const updates = ekmClient.getUpdates();
                    const errors = ekmClient.getErrors();

                    console.log(colors.green.bold(`\n✔ Export complete (${updates.length} products updated)`));
                    const end = new Date().getTime();
                    const d = end - start;
                    console.log(colors.magenta.bold(`\n★ Duration: ${Math.round(d / 1000 / 60 * 10) / 10}mins`));

                    if (errors.length) {
                        console.log(colors.red.bold(`\n✘ Failed to update ${errors.length} products (See ./reports/${tag})`));
                    }

                    fs.ensureDirSync(path.resolve('reports').replace(/\\/g, '/'));
                    fs.ensureFileSync(path.resolve('reports', tag).replace(/\\/g, '/'));
                    fs.writeFileSync(path.resolve('reports', tag).replace(/\\/g, '/'), JSON.stringify({ errors, updates }, null, 4));
                    console.log(colors.cyan.cyan.bold('\n✔ Report created\n'));
                    console.log(colors.green.green.bold('✔ All done! 🍻\n'));
                    return;
                }
                setTimeout(() => {
                    return resolve();
                }, throttle);
            }));
        }

    });

})();
