# ekm-product-inventory-updater
Simple app which accepts .csv files to update product quantities in the `EKM - Advanced Inventory Manager`.  

## Installation

**This app requires `node.js v10.16.1`.**  

Then:

    $ git clone https://github.com/b3nThomas/ekm-product-inventory-updater.git
    $ cd ekm-product-inventory-updater
    $ npm i
    $ npm run build

## Setup

In order to run this app, you must do the following:

### EKM Auth
  - Create a file in the `app` folder called `auth.json`
  - Copy the content from `./app/auth.json.template` into your new file
  - Update the field values to match that of the [EKM-API feature section](https://youraccount.30.ekm.net/ekmps/shops/features_api.asp)
  - These credentials are ignored by .git so will only ever exist on your local machine 👍

## Input CSV file
  - From your source of truth for stock quantites, export a simple report named `data.csv`, based on `./app/data.csv.template`  
  - Move the file to `./app/data.csv`  
  - When run, the tool will use this data to update the stock quantites in EKM  

## Usage  

    $ npm run start

Job's a gooden 👍
