const express = require('express');
const bodyParser = require('body-parser');
const { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
const axios = require('axios'); // For fetching SOL price
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Load the vault wallet's private key from .env
const VAULT_PRIVATE_KEY = JSON.parse(process.env.VAULT_PRIVATE_KEY);
const vaultWallet = Keypair.fromSecretKey(new Uint8Array(VAULT_PRIVATE_KEY));

// Function to fetch the current SOL/USDT price
async function getSolPrice() {
    return 140; // Mock price for testing. in USDT...
    /* try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usdt');
        return response.data.solana.usdt;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        throw new Error('Failed to fetch SOL price');
    } */
}

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

// Function to verify card payment (mock implementation)
async function verifyCardPayment(transactionId) {
    // Replace this with actual payment gateway API call
    console.log(`Verifying card payment with transaction ID: ${transactionId}`);
    return { success: true, amountInUsdt: 70 }; // Mock response
}

// Payout endpoint
app.get('/payout', async (req, res) => {
    const { wallet_address, payment_type, network, transaction_signature, transaction_id } = req.query;

    // Validate required parameters
    if (!wallet_address || !payment_type) {
        return res.status(400).json({ error: 'Missing required parameters: wallet_address and payment_type' });
    }

    try {
        if (payment_type === 'card' || payment_type === 'flutterwave') {
            // Verify card payment
            if (!transaction_id) {
                return res.status(400).json({ error: 'Missing transaction_id for card payment' });
            }

            const { success, amountInUsdt } = await verifyCardPayment(transaction_id);

            if (!success) {
                return res.status(400).json({ error: 'Card payment verification failed' });
            }

            // Fetch the current SOL price
            const solPrice = await getSolPrice();
            const amountInSol = amountInUsdt / solPrice;

            // Send SOL to the user's wallet
            const connection = new Connection('https://api.devnet.solana.com'); // Use devnet for testing
            const signature = await sendSol(wallet_address, amountInSol, connection);

            return res.json({ 
                message: 'Card payment processed and SOL sent', 
                wallet_address, 
                amountInSol, 
                transaction_signature: signature 
            });
        } else if (payment_type === 'blockchain') {
            // Validate blockchain-specific parameters
            if (!network || !transaction_signature) {
                return res.status(400).json({ error: 'Missing required parameters for blockchain payment: network and transaction_signature' });
            }

            // Verify the transaction on the Solana network
            const connection = new Connection(
                network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'
            );

            const transaction = await connection.getTransaction(transaction_signature);

            if (!transaction) {
                return res.status(400).json({ error: 'Transaction not found on the blockchain' });
            }

            if (transaction.meta?.err) {
                return res.status(400).json({ error: 'Transaction failed on the blockchain' });
            }

            // Extract the amount from the transaction (assuming it's the first transfer instruction)
            const amountInLamports = transaction.meta?.postBalances[1] - transaction.meta?.preBalances[1];
            const amountInSol = amountInLamports / LAMPORTS_PER_SOL;

            // Send the same amount of SOL to the user's wallet
            const signature = await sendSol(wallet_address, amountInSol, connection);

            return res.json({ 
                message: 'Blockchain payment processed and SOL sent', 
                wallet_address, 
                amountInSol, 
                transaction_signature: signature 
            });
        } else {
            return res.status(400).json({ error: 'Invalid payment type. Supported types: card, flutterwave, blockchain' });
        }
    } catch (error) {
        console.error('Error processing payout:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});