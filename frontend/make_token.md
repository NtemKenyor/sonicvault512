Here’s a fast and efficient way to create a token using the Solana CLI, generate metadata (name, symbol, description, and image), and send the token to the specified address.  

---

### **Step 1: Set RPC URL**  
```sh
solana config set --url https://api.testnet.sonic.game/
```

---

### **Step 2: Generate a New Keypair for the Token Mint**  
```sh
solana-keygen new --outfile token-keypair.json
```
This will create a keypair file (`token-keypair.json`) for the token mint.

---

### **Step 3: Create a Token Mint**  
```sh
TOKEN_MINT=$(spl-token create-token --owner token-keypair.json --output json | jq -r '.["transaction"]["signers"][0]')
```
This extracts the newly created token mint address.

---

### **Step 4: Create an Associated Token Account for Receiving Tokens**  
```sh
TOKEN_ACCOUNT=$(spl-token create-account $TOKEN_MINT --output json | jq -r '.["transaction"]["signers"][0]')
```

---

### **Step 5: Mint Tokens to Your Address**  
```sh
spl-token mint $TOKEN_MINT 1000
```
This mints `1000` tokens to the creator's account.

---

### **Step 6: Transfer Tokens to Your Address**  
Replace `RECIPIENT_ADDRESS` with your actual recipient wallet address.  
```sh
RECIPIENT_ADDRESS="6dVg7wGA2xnkNtcJXDgzDpD6BYvLZqExJ8AGqUoXUJqN"
spl-token transfer $TOKEN_MINT 500 $RECIPIENT_ADDRESS
```
This transfers `500` tokens to the provided address.

---

### **Step 7: Generate Metadata (Name, Symbol, Image, Description)**
#### **Fast approach using AI-generated metadata**
Run this in a terminal to fetch a random image and generate metadata:
```sh
TOKEN_NAME=$(curl -s "https://random-word-api.herokuapp.com/word?number=2" | jq -r 'join(" ")')
TOKEN_SYMBOL=$(echo $TOKEN_NAME | awk '{print substr($1,1,3) substr($2,1,3)}' | tr '[:lower:]' '[:upper:]')
TOKEN_DESCRIPTION="A unique Solana token for $TOKEN_NAME"
TOKEN_IMAGE=$(curl -s "https://source.unsplash.com/random/300x300" -o token_image.jpg && echo "token_image.jpg")
```
This generates:  
✅ A random name  
✅ A 6-letter symbol  
✅ A random image from Unsplash  
✅ A basic description  

---

### **Step 8: Upload Metadata to Arweave (Optional but Recommended)**
Use `metaplex` to upload metadata:  
```sh
metaplex upload token_image.jpg --keypair token-keypair.json
```
This returns an Arweave link you can use for the token logo.

---

### **Step 9: Set Token Metadata (Requires Metaplex CLI)**  
```sh
metaplex create-metadata --keypair token-keypair.json \
    --mint $TOKEN_MINT \
    --name "$TOKEN_NAME" \
    --symbol "$TOKEN_SYMBOL" \
    --uri "https://arweave.net/YOUR_METADATA_JSON_LINK"
```

---

### **Step 10: Verify Token and Supply**  
```sh
spl-token accounts
spl-token supply $TOKEN_MINT
```

---

That’s it! 🎉 You now have a token with metadata and sent it to your recipient. 🚀