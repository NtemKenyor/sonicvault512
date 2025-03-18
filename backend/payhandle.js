// const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const axios = require('axios');
// const { vaultWallet, sendSol } = require('./utils'); // Assuming you have a utils file for shared functions

const { Connection, PublicKey,  Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
require('dotenv').config();

// Load the vault wallet's private key from .env
const VAULT_PRIVATE_KEY = JSON.parse(process.env.VAULT_PRIVATE_KEY);
const vaultWallet = Keypair.fromSecretKey(new Uint8Array(VAULT_PRIVATE_KEY));

// Function to send SOL from the vault wallet to the user's wallet
async function sendSol(toWalletAddress, amountInSol, connection) {
    try {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultWallet.publicKey,
                toPubkey: new PublicKey(toWalletAddress),
                lamports: amountInSol * LAMPORTS_PER_SOL,
            })
        );

        // Sign and send the transaction
        const signature = await sendAndConfirmTransaction(connection, transaction, [vaultWallet]);
        return signature;
    } catch (error) {
        console.error('Error sending SOL:', error);
        throw new Error('Failed to send SOL');
    }
}

// module.exports = { vaultWallet, sendSol };

// Function to fetch the current SOL/USDT price
async function getSolPrice() {
    return 140;
    /* try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usdt');
        return response.data.solana.usdt;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        throw new Error('Failed to fetch SOL price');
    } */
}

// Function to verify card payment (mock implementation)
async function verifyCardPayment(transactionId) {
    // Replace this with actual payment gateway API call
    console.log(`Verifying card payment with transaction ID: ${transactionId}`);
    return { success: true, amountInUsdt: 100 }; // Mock response
}

let sonic_mainnet = 'https://rpc.mainnet-alpha.sonic.game';
let sonic_testnet = 'https://api.testnet.sonic.game/'

let solana_mainnet = 'https://api.mainnet-beta.solana.com';
let solana_devnet = 'https://api.devnet.solana.com';


// Main payout handler function
async function handlePayout(wallet_address, sol_quantity, payment_type, s_network, r_network, transaction_signature, transaction_id) {
    if (payment_type === 'card' || payment_type === 'flutterwave') {
        // Verify card payment
        if (!transaction_id) {
            throw new Error('Missing transaction_id for card payment');
        }

        const { success, amountInUsdt } = await verifyCardPayment(transaction_id);

        if (!success) {
            throw new Error('Card payment verification failed');
        }

        // Fetch the current SOL price
        const solPrice = await getSolPrice();
        const amountInSol = amountInUsdt / solPrice;

        // Send SOL to the user's wallet
        const connection = (s_network === "mainnet") ? new Connection(sonic_mainnet) : new Connection(sonic_testnet); // Use devnet for testing
        const signature = await sendSol(wallet_address, amountInSol, connection);

        return { 
            message: 'Card payment processed and SOL sent', 
            wallet_address, 
            amountInSol, 
            transaction_signature: signature 
        };
    } else if (payment_type === 'solana') {
        // Validate blockchain-specific parameters
        if (!r_network || !transaction_signature) {
            throw new Error('Missing required parameters for blockchain payment: network and transaction_signature');
        }

        // Verify the transaction on the Solana network
        /* 
        const connection = new Connection(
            r_network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'
        );
        
        const transaction = await connection.getTransaction(transaction_signature);
        if (!transaction) {
            throw new Error('Transaction not found on the blockchain');
        }
        if (transaction.meta?.err) {
            throw new Error('Transaction failed on the blockchain');
        }

        // Extract the amount from the transaction (assuming it's the first transfer instruction)
        const amountInLamports = transaction.meta?.postBalances[1] - transaction.meta?.preBalances[1];
        const amountInSol = amountInLamports / LAMPORTS_PER_SOL; */

        // Send the same amount of SOL to the user's wallet
        const connection = new Connection(
            s_network === 'mainnet' ? sonic_mainnet : sonic_testnet
        );
        const signature = await sendSol(wallet_address, amountInSol, connection);

        return { 
            message: 'Blockchain payment processed and SOL sent', 
            wallet_address,
            sol_quantity, 
            // amountInSol, 
            transaction_signature: signature 
        };
    } else {
        throw new Error('Invalid payment type. Supported types: card, flutterwave, blockchain');
    }
}

module.exports = { handlePayout };