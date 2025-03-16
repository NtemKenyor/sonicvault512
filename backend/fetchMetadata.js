/* const { exec } = require('child_process');

//  * Fetch data using the QuickNode API via the curl command.
//  *
//  * @param {string} apiKey - The API key for authentication.
//  * @returns {Promise<string>} - The response from the API.
function fetchDataWithCurl(apiKey) {
    return new Promise((resolve, reject) => {
        const curlCommand = `
            curl -X POST "https://api.quicknode.com/functions/rest/v1/functions/383e033e-937a-4338-8e7a-129e357baed5/call?result_only=true" \
            -H "accept: application/json" \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${apiKey}" \
            -d '{"network": "solana-devnet", "dataset": "block", "blockNumber": 19532341, "user_data": {"max_fee": 8.5}}'
        `;

        exec(curlCommand, (error, stdout, stderr) => {
            if (error) {
                reject(`Execution error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.warn(`Curl stderr (non-critical): ${stderr}`);
            }
            resolve(stdout);
        });
    });
}

// Example usage:
async function fetchMetadataForAccounts () {
    require("dotenv").config();

    const Quicknode = process.env.Quicknode;

    // console.log(Quicknode);
    const API_KEY = Quicknode; // Replace with your actual API key

    try {
        const result = await fetchDataWithCurl(API_KEY);
        let datum = JSON.parse(result);
        console.log("API Response:", datum);
        return datum.reals;
    } catch (error) {
        console.error("Failed to fetch data:", error);
        return [];
    }
};

module.exports = { fetchMetadataForAccounts }; 
 */

// Example usage:
// (async () => {
//     require("dotenv").config();

//     const Quicknode = process.env.Quicknode;

//     console.log(Quicknode);
//     const API_KEY = Quicknode; // Replace with your actual API key

//     try {
//         const result = await fetchDataWithCurl(API_KEY);
//         console.log("API Response:", JSON.parse(result));
//     } catch (error) {
//         console.error("Failed to fetch data:", error);
//     }
// })();





// fetchMetadata.js
const { Connection, PublicKey } = require("@solana/web3.js");
const { deserialize } = require("borsh");
require('dotenv').config();

// // 7sGT7oBKSetii8mspduzWR8EeYq86z51v9BdwfkEW2Wr
// const programId = new PublicKey("A6GEfSbfhFa1H41sUVfeyZM9riLi3SdGaEjGjHaxFQvs");
let programId = new PublicKey("A6GEfSbfhFa1H41sUVfeyZM9riLi3SdGaEjGjHaxFQvs");
let devProgramId = new PublicKey("HFVqnPDCPdtQF5mArXP7siH9uVz75wUAupzEEUmmLd57");


class PostMetadata {
    constructor({ title, content, image_url, author, date, others }) {
        this.title = title;
        this.content = content;
        this.image_url = image_url;
        this.author = author;
        this.date = date;
        this.others = others;
    }
}

const postMetadataSchema = new Map([
    [PostMetadata, { kind: "struct", fields: [
        ["title", "string"],
        ["content", "string"],
        ["image_url", "string"],
        ["author", "string"],
        ["date", "string"],
        ["others", "string"]
    ]}],
]);

async function fetchMetadataForAccounts(rpcUrl, network) {
    const accountMetadata = [];

    // const connection = (network === "localhost" || network === "developmet") 
    //     ? new Connection("http://127.0.0.1:8899", "confirmed")
    //     : new Connection("https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317 ", "confirmed");

    // const connection = new Connection("https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317 ", "confirmed");
    const connection = new Connection(rpcUrl, 'confirmed');

    if(network === "devnet" || network === "dev"){
        programId = devProgramId;
    }

    try {
        const programAccounts = await connection.getProgramAccounts(programId, {
            commitment: "confirmed",
            encoding: "base64",
        });

        for (const account of programAccounts) {
            const metadata = deserialize(postMetadataSchema, PostMetadata, Buffer.from(account.account.data, 'base64'));
            accountMetadata.push({
                pubkey: account.pubkey.toString(),
                metadata,
            });
        }

        return accountMetadata;

    } catch (err) {
        console.error("Error fetching account metadata:", err);
        return [];
    }
}

module.exports = { fetchMetadataForAccounts };
