// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { fetchMetadataForAccounts } = require("./fetchMetadata");
const { createPost } = require("./createPost");
const forge = require("node-forge");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios'); // Import axios
const { handlePayout } = require('./payhandle');


const app = express();
const PORT = 3000;
// app.use(cors());


// Load server's private key from environment variable
const serverPrivateKeyPem = process.env.SERVER_PRIVATE_KEY;
const serverPublicKeyPem = process.env.SERVER_PUBLIC_KEY;
let dNetwork = process.env.NODE_ENV;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // API key from .env file


// DeepSeek API endpoint
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'; // Replace with actual DeepSeek API URL

// console.log(DEEPSEEK_API_KEY);


let MAIN_DIR = "/sonicvault512/backend";

app.use(cors());
app.use(express.json());

//Loading all functions here


function getKeyFingerprint(pem) {
    // Convert PEM to public key object
    const key = forge.pki.publicKeyFromPem(pem);
    // Convert key to DER format and create a hash with forge
    const der = forge.asn1.toDer(forge.pki.publicKeyToAsn1(key)).getBytes();
    const sha256 = forge.md.sha256.create();
    sha256.update(der, "binary");
    return sha256.digest().toHex();
}

async function decryptPrivateKey(privateKeyPem, encryptedPrivateKeyJson) {
    // Parse the received JSON string into an object
    const encryptedData = JSON.parse(encryptedPrivateKeyJson);
    
    // Convert the server's private key from PEM format to a Forge private key object
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Decrypt each encrypted chunk using RSA-OAEP
    const decryptedChunks = await Promise.all(encryptedData.encryptedChunks.map(async (encryptedChunk) => {
        try {
            let retrievedKey = privateKey.decrypt(encryptedChunk, 'RSA-OAEP');
            // console.log(retrievedKey);
            return retrievedKey;
        } catch (error) {
            console.error("Error decrypting chunk:", error);
            throw error;
        }
    }));

    // Reconstruct the original private key by joining the decrypted chunks
    const decryptedPrivateKey = decryptedChunks.join('');

    // Return the decrypted private key (in original string format)
    return decryptedPrivateKey;
}



// Define RPC endpoints for each network
const NETWORK_RPC_ENDPOINTS = {
    mainnet: [
        'https://rpc.mainnet-alpha.sonic.game',
        'https://api.mainnet-alpha.sonic.game', // Primary
        'https://sonic.helius-rpc.com/', // Backup 1
        // 'https://ssc-dao.genesysgo.net', // Backup 2
    ],
    main: [
        'https://rpc.mainnet-alpha.sonic.game',
        'https://api.mainnet-alpha.sonic.game', // Primary
        'https://sonic.helius-rpc.com/', // Backup 1
        // 'https://ssc-dao.genesysgo.net', // Backup 2
    ],
    devnet: [
        // 'https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317', // Backup 1
        // 'https://api.devnet.solana.com', // Primary
        'https://api.testnet.sonic.game/',
    ],
    // development: ['https://api.devnet.solana.com',],
    // dev: ['https://api.devnet.solana.com',],
    development: ['https://api.testnet.sonic.game/',],
    dev: ['https://api.testnet.sonic.game/',],
    localnet: [
        'http://127.0.0.1:8899', // Primary (local node)
    ],
};


// Function to get the first available RPC endpoint for a given network
async function getAvailableRpcEndpoint(network) {
    const endpoints = NETWORK_RPC_ENDPOINTS[network] || [];
    return endpoints[0]
    // for (const url of endpoints) {
    //     try {
    //         const connection = new Connection(url, 'confirmed');
    //         // Test the connection by fetching the latest block height
    //         await connection.getBlockHeight();
    //         return url; // Return the first reachable endpoint
    //     } catch (error) {
    //         console.warn(`RPC endpoint ${url} is unreachable:`, error);
    //     }
    // }
    // throw new Error(`No reachable RPC endpoints found for network: ${network}`);
}



// Serve "Hello World" at /sonic_universe/client/sonic_planet/api/
app.get(MAIN_DIR+'/', (req, res) => {
    res.send('Entrace Point - Hello world');
});

app.get(MAIN_DIR+"/api/metadata", async (req, res) => {
    const network_pref = req.query.network; // Extract the network parameter
    console.log("Received network:", network_pref);

    // set the preferred network from users-endpayoutHandlerpayoutHandler
    if(network_pref != null){
        dNetwork = network_pref;
    }

    // Get the first available RPC endpoint for the specified network
    const rpcUrl = await getAvailableRpcEndpoint(dNetwork);
    // const connection = new Connection(rpcUrl, 'confirmed');

    const metadata = await fetchMetadataForAccounts(rpcUrl, dNetwork);
    res.json(metadata);
});


app.get(MAIN_DIR+"/api/user-yields", async (req, res) => {
    const data = req.query;
    const network_pref = data.network; // Extract the network parameter
    console.log("Received network:", network_pref);
    const wallet_address = data.user; //public wallet address of the user

    // set the preferred network from users-end
    if(network_pref != null){
        dNetwork = network_pref;
    }

    // Get the first available RPC endpoint for the specified network
    const rpcUrl = await getAvailableRpcEndpoint(dNetwork);
    // const connection = new Connection(rpcUrl, 'confirmed');

    const metadata = await fetchMetadataForAccounts(rpcUrl, dNetwork);
    res.json(metadata);
});

// ?network=devnet&wallet_address=AAFW4kLEuUWwVhUXdQ3QiS7UEBbDRHiztXstsf4jwGJ4&sol_amount=0.05&usdt_paid=300&payment_type=flutterwave&s_network=devnet&r_network=devnet&transaction_signature=null&transaction_id=null&transunique=undefined
// Payout endpoint
app.get(MAIN_DIR+'/api/payout', async (req, res) => {
    const { wallet, sol_amount, usdt_paid, payment_type, network, s_network, r_network, transaction_signature, transaction_id, transunique } = req.query;

    // Validate required parameters
    if (!wallet || !payment_type) {
        return res.status(400).json({ error: 'Missing required parameters: wallet_address and payment_type' });
    }

    try {
        const result = await handlePayout(wallet, sol_amount, usdt_paid, payment_type, network, s_network, r_network, transaction_signature, transaction_id, transunique);
        return res.json(result);
    } catch (error) {
        console.error('Error processing payout:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }

});

// Generate game content using DeepSeek API
/* app.post(MAIN_DIR+'/generate', async (req, res) => {
    const { prompt, solanaAddress, code_state, emojis, platformers, effects } = req.body;

    try {
        // Construct the system message dynamically
        let systemMessage = `You are a web Game developer. Return an HTML game with embedded CSS and JavaScript. Do not assume that the User is experienced: so always return all the necessary lines of HTML code and make sure that you always improve the current code state based on the user's prompt. Users should be able to click a floating start button or use an event listener to detect a scroll into view to start playing the game.`;

        // Add code_state if it exists
        if (code_state && code_state.trim() !== '') {
            systemMessage += `\n- The current code state: ${code_state}`;
        }

        // Add emojis if the array is not empty
        if (emojis && emojis.length > 0) {
            systemMessage += `\n- Emojis: ${emojis.join(', ')}`;
        }

        // Add platformers if the array is not empty
        if (platformers && platformers.length > 0) {
            systemMessage += `\n- Platformers: ${platformers.join(', ')}`;
        }

        // Add effects if the array is not empty
        if (effects && effects.length > 0) {
            systemMessage += `\n- Effects: ${effects.join(', ')}`;
        }

        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat', // Use the most recent DeepSeek model
                messages: [
                    {
                        role: 'system',
                        content: systemMessage,
                    },
                    {
                        role: 'user',
                        content: `Generate a game based on the following prompt: ${prompt}`,
                    },
                ],
                stream: false,
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const generatedContent = response.data.choices[0].message.content;
        res.json({ content: generatedContent });
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        res.status(500).json({ error: 'Failed to generate game content' });
    }
}); */

app.post(MAIN_DIR+"/api/create-post", async (req, res) => {
    const { encryptedPrivateKey, publicKey, title, content, image_url, author, date, network_pref, others } = req.body;

    if (!encryptedPrivateKey || !publicKey || !content) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Get fingerprints of the provided public key and server's public key
        console.log(publicKey, serverPublicKeyPem);
        // console.log(dNetwork);
        const clientPublicKeyFingerprint = getKeyFingerprint(publicKey);
        const serverPublicKeyFingerprint = getKeyFingerprint(serverPublicKeyPem);

        if (clientPublicKeyFingerprint !== serverPublicKeyFingerprint) {
            return res.status(403).json({ error: "Invalid encryption public key" });
        }



        const decryptedPrivateKey = await decryptPrivateKey(serverPrivateKeyPem, encryptedPrivateKey);

        console.log(content, others); // This will be the original private key object

        // Decrypt user's private key using server's private key
        // const privateKey = forge.pki.privateKeyFromPem(serverPrivateKeyPem);

        // // Decode the base64 encoded encrypted private key
        // const encryptedBytes = forge.util.decode64(encryptedPrivateKey);

        // // Decrypt the private key
        // const decryptedPrivateKey = privateKey.decrypt(encryptedBytes, "RSA-OAEP");

        // console.log(decryptedPrivateKey);

        // Use the decrypted private key to create the user's Keypair
        const userKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(decryptedPrivateKey)));
        // const metadata = new PostMetadata({ title, content, image_url, author, date, others });
        // console.log(userKeypair, dNetwork);

        const metadata = { title, content, image_url, author, date, others };

        // set the preferred network from users-end
        if(network_pref != null){
            dNetwork = network_pref;
        }

        // Get the first available RPC endpoint for the specified network
        const rpcUrl = await getAvailableRpcEndpoint(dNetwork);
        // const connection = new Connection(rpcUrl, 'confirmed');

        // Proceed to create the post on the blockchain
        const {signature, program_account} = await createPost(userKeypair, metadata, rpcUrl, dNetwork);
        // res.json({ status: "True", message: "Post created successfully", edit_key: program_account, signature });
        res.json({ status: "True", message: "Post created successfully", signature });
        
    } catch (err) {
        console.error("Error creating post:", err);
        console.error("Error during transaction execution:", err.message);
        let blockchain_logs;
        if (err.getLogs) {
            blockchain_logs = await err.getLogs()
            console.log("Logs:", blockchain_logs );
        }
        
        res.status(500).json({ error: "Failed to create post", details: err });
    }
});


// Ensure the gameProjects folder exists
/* const gameProjectsDir = path.join(__dirname, 'gameProjects');
if (!fs.existsSync(gameProjectsDir)) {
    fs.mkdirSync(gameProjectsDir);
} */
const gameProjectsDir = path.join(__dirname, '../../gameProjects');
if (!fs.existsSync(gameProjectsDir)) {
    fs.mkdirSync(gameProjectsDir, { recursive: true }); // Create the folder if it doesn't exist
}

// Generate a unique project name
function generateUniqueName() {
    return crypto.randomBytes(16).toString('hex'); // Generates a 32-character random string
}

// Endpoint to save the game project
app.post(MAIN_DIR+'/launch', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    // Generate a unique project name
    const projectName = generateUniqueName();
    const projectPath = path.join(gameProjectsDir, `${projectName}.html`);

    // Save the code to the file
    fs.writeFile(projectPath, code, (err) => {
        if (err) {
            console.error('Error saving project:', err);
            return res.status(500).json({ error: 'Failed to save project' });
        }

        // Return the link to the user
        const projectLink = `http://localhost:${port}/game/${projectName}`;
        res.json({ link: projectLink });
    });
});

// Serve the game project
app.get(MAIN_DIR+'/game/:projectName', (req, res) => {
    const projectName = req.params.projectName;
    const projectPath = path.join(gameProjectsDir, `${projectName}.html`);

    if (!fs.existsSync(projectPath)) {
        return res.status(404).send('Game not found');
    }

    res.sendFile(projectPath);
});




app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
