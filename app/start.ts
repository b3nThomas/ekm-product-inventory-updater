import * as colors from 'colors';
import * as parseCSV from 'csv-parse';
import * as ProgressBar from 'progress';
import * as fs from 'fs-extra';
import * as path from 'path';
import { EKMClient } from './EKMClient';

console.log(colors.cyan.bold('★ Starting EKM Product Inventory Updater...\n'));
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
            console.error(colors.red.bold('✖︎ Error parsing data.csv. Please retry. Aborting...\n'));
            return process.exit(1);
        }

        console.log(colors.yellow.bold(`★ ${output.length} products to update...\n`));

        try {
            await ekmClient.startBrowser();
            await ekmClient.signIn();

            const bar = new ProgressBar(colors.magenta.bold('★ :current / :total :bar :percent (:elapseds)'), { total: output.length, width: 75 });

            for (const entry of output) {
                if (!('ItemID' in entry) || !('Stock' in entry) || !('Price' in entry)) {
                    console.error(colors.red.bold('✘ Skipping invalid product entry...'));
                    console.error(colors.red.bold(entry), '\n');
                    ekmClient.logError({ entry, err: 'CSV entry is missing ItemID, Stock or Price' });
                } else {
                    await ekmClient.updateProduct(entry.ItemID, entry.Stock, entry.Price.replace('£', ''));
                }

                bar.tick();

                if (bar.complete) {
                    await ekmClient.stopBrowser();
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
            }
        } catch (err) {
            console.log(colors.red.bold('\n✘ Fatal error occurred. Aborting...'));
            console.log({ err });
            process.exit(1);
        }
    });
})();
