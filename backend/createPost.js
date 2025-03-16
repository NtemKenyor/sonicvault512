// createPost.js
const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");
const { serialize } = require("borsh");

// Program ID and connection setup//
// const programId = new PublicKey("7sGT7oBKSetii8mspduzWR8EeYq86z51v9BdwfkEW2Wr");
// const programId = new PublicKey("CYuj8Uxj9dVzEN5Gi6SVzfbEHjcfwuDLCtYpvZ7tYnqz");
// const programId = new PublicKey("A6GEfSbfhFa1H41sUVfeyZM9riLi3SdGaEjGjHaxFQvs");
let programId = new PublicKey("A6GEfSbfhFa1H41sUVfeyZM9riLi3SdGaEjGjHaxFQvs");
let devProgramId = new PublicKey("HFVqnPDCPdtQF5mArXP7siH9uVz75wUAupzEEUmmLd57");

// const programId = new PublicKey("J2CNybqbZfJTaeBxvXtTWGUW3KQQy7BACajWqPHfMCf4");


// Define the PostMetadata class with UTC timestamp support
class PostMetadata {
    constructor({ title, content, image_url, author, date = getUtcTimestamp(), others }) {
        this.title = title;
        this.content = content;
        this.image_url = image_url;
        this.author = author;
        this.date = date;
        this.others = others;
    }
}

// Borsh schema for serializing PostMetadata
const postMetadataSchema = new Map([
    [PostMetadata, { kind: "struct", fields: [
        ['title', 'string'],
        ['content', 'string'],
        ['image_url', 'string'],
        ['author', 'string'],
        ['date', 'string'],  // UTC timestamp as string
        ['others', 'string']
    ]}],
]);

// Helper function to get the current UTC timestamp as a string
function getUtcTimestamp() {
    return new Date().toISOString(); // ISO string format in UTC
}

/* 
async function createPost(userKeypair, metadata, network="mainnet") {
    const postAccount = Keypair.generate();
    const metadataWithUtc = new PostMetadata(metadata); // Ensure date defaults to UTC if not provided

    // const connection = (network === "localhost" || network === "development") 
    // ? new Connection("http://127.0.0.1:8899", "confirmed")
    // : new Connection("https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317", "confirmed");

    //https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317
    // Serialize the metadata with the timestamp
    // const connection =new Connection("http://127.0.0.1:8899", "confirmed");
    // console.log("creating post: ", network );
    // const connection = new Connection("https://spring-quick-surf.solana-devnet.quiknode.pro/016ff48f0f7c3f1520e515c01dca9a83ef528317", "confirmed");
    const connection = new Connection("", "confirmed");


    const serializedMetadata = serialize(postMetadataSchema, metadataWithUtc);

    // console.log(connection);
    // Create the account and store metadata on the blockchain
    const createPostTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: userKeypair.publicKey,
            newAccountPubkey: postAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(serializedMetadata.length),
            space: serializedMetadata.length,
            programId: programId,
        })
    );

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    createPostTx.recentBlockhash = blockhash;
    createPostTx.feePayer = userKeypair.publicKey;


    // Add the serialized data to the transaction
    createPostTx.add({
        keys: [
            { pubkey: postAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(serializedMetadata),
    });

    // Sign and send the transaction
    const signature = await connection.sendTransaction(createPostTx, [userKeypair, postAccount]);
    // await connection.confirmTransaction(signature);
    await connection.confirmTransaction(signature, "confirmed");

    return {
        signature: signature,
        program_account: JSON.stringify(Array.from(postAccount.secretKey)),
        // state: true,
    };
    
    
}
 */

async function createPost(userKeypair, metadata, rpcUrl, ) {
    const postAccount = Keypair.generate();
    const metadataWithUtc = new PostMetadata(metadata); // Ensure date defaults to UTC if not provided

    //use devnet program_id if network is devnet
    if(network === "devnet" || network === "dev"){
        programId = devProgramId;
    }
    // Get the first available RPC endpoint for the specified network
    // const rpcUrl = await getAvailableRpcEndpoint(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    console.log(`Using RPC endpoint: ${rpcUrl}`);

    // Serialize the metadata with the timestamp
    const serializedMetadata = serialize(postMetadataSchema, metadataWithUtc);

    // Create the account and store metadata on the blockchain
    const createPostTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: userKeypair.publicKey,
            newAccountPubkey: postAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(serializedMetadata.length),
            space: serializedMetadata.length,
            programId: programId,
        })
    );

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    createPostTx.recentBlockhash = blockhash;
    createPostTx.feePayer = userKeypair.publicKey;

    // Add the serialized data to the transaction
    createPostTx.add({
        keys: [
            { pubkey: postAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(serializedMetadata),
    });

    // Sign and send the transaction
    const signature = await connection.sendTransaction(createPostTx, [userKeypair, postAccount]);
    await connection.confirmTransaction(signature, "confirmed");

    return {
        signature: signature,
        program_account: JSON.stringify(Array.from(postAccount.secretKey)),
    };
}


module.exports = { createPost };
