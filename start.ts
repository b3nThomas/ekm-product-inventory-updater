import * as colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';
import { EKMClient } from './app/EKMClient';

import * as csv from 'convert-csv-to-json'; // REPLACE

const ekmClient = new EKMClient();

(async () => {
    let data;
    try {
        data = csv.fieldDelimiter(',').generateJsonFileFromCsv(path.resolve('app', 'data.csv'), path.resolve('app', 'data.json'));
    } catch (err) {
        console.log(colors.red('Unable to locate ./app/data.csv file. See README.md. Aborting...\n'));
        process.exit(1);
    }

    const json = fs.readFileSync(path.resolve('app', 'data.json'), { encoding: 'utf-8' }); // tslint:disable-line

    console.log(json);
    const current = await ekmClient.getProducStock('SALTEA');
    console.log(colors.green(`SALTEA: ${current} in stock`));
    const sold = 4;
    const newAmount = current + sold;
    ekmClient.setProductStock('SALTEA', newAmount);
})();
