# Decentralized Intellectual Property Provenance and Licensing System Using Blockchain

An end-to-end simulation of a tamper-evident, decentralized intellectual property registry on an EVM-compatible Proof-of-Stake blockchain, featuring off-chain storage via a simulated local IPFS node.

---

## 🚀 Quick Start (100% Free Local Simulation)

Everything runs on your local machine with **zero cost**, **zero external API keys**, and **instant transaction confirmation**.

### Prerequisites
- Node.js (v18+)
- MetaMask extension installed in your web browser

---

### Step 1: Start the Local Blockchain Node
Open a terminal in the project root:
```bash
cd blockchain
npx hardhat node
```
> **What this does:** Starts a local EVM blockchain running on `http://127.0.0.1:8545` (Chain ID: `31337`). It provides 20 pre-funded test accounts, each loaded with **10,000 free test ETH**. Leave this terminal running!

---

### Step 2: Deploy the Smart Contract
Open a second terminal:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
> **What this does:** Deploys `IPRegistry.sol` to your local blockchain and automatically exports the contract ABI and address to `frontend/src/contracts/`.

---

### Step 3: Start the Next.js Frontend
In the same or a third terminal:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🦊 Configuring MetaMask for Local Testing

1. Open MetaMask and click the **Network selector** (top left).
2. Click **Add Network** → **Add a network manually**.
3. Fill in:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to `Hardhat Localhost`.

### Importing Pre-Funded Test Accounts (10,000 Free ETH)
In MetaMask, click your profile icon → **Add account or hardware wallet** → **Import account**, then paste any of these private keys:

- **Account #0 (Creator / First User):**
  - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Account #1 (Buyer / Transferee):**
  - Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

---

## 🎬 Live Presentation Walkthrough: Demonstrating All 8 PPT Features

Follow this exact flow during your presentation to demonstrate every promised capability:

### 1. IP Registration (`/register`)
- Connect MetaMask (Account #0).
- Drag and drop any file (code snippet, PDF, image, audio).
- Notice the **instant SHA-256 digest calculation** generated right in your browser.
- Select a license template (e.g. *MIT License* or *Creative Commons CC-BY 4.0*).
- Click **Register on Blockchain**.
- Watch the live **5-step pipeline**: File Ingestion → SHA-256 Digest → Local IPFS Pinning (CIDv0) → MetaMask Signing → Mined on EVM Block.

### 2. Timestamped Proof (`/verify` & `/dashboard`)
- After registration, view the exact block confirmation timestamp.
- Shows undeniable evidentiary proof of existence and creation time anchored by block consensus.

### 3. Duplicate Detection (`/register`)
- Try selecting the **exact same file** again on the Register page.
- Notice the immediate warning: **⚠️ DUPLICATE DETECTED: This file hash has already been registered on-chain.**
- Shows how the protocol prevents duplicate and fraudulent claims.

### 4. Authenticity Check (`/verify`)
- Go to the **Verify** page.
- Drop in the original file → Instantly displays **✓ VERIFIED AUTHENTIC & UNTAMPERED** with green cryptographic badge.
- Edit the file (even add a single space) and re-upload → Instantly shows **✗ UNREGISTERED OR ALTERED ASSET** with red badge! Demonstrates avalanche effect of SHA-256 hashing.

### 5. Public Verification (`/verify`)
- Disconnect MetaMask or open the page in an Incognito window.
- Search by the file's hash or paste the shareable audit link.
- Anyone can verify the asset with **no login required**.

### 6. Version History (`/dashboard` & `/register`)
- Go to **Dashboard**, find your registered asset, and click **Publish Next Revision (v2)**.
- Upload an updated version of your work.
- The smart contract automatically chains this revision to the predecessor hash, establishing an immutable parent-child lineage.

### 7. Digital Licensing Management (`/dashboard`)
- Under your registered asset in the Dashboard, click **✏️ Update License Terms**.
- Change the terms (e.g. from MIT to Commercial Proprietary) and confirm in MetaMask.
- The smart contract updates the licensing agreement directly on-chain while preserving the immutable original file hash.

### 8. Ownership Transfer (`/transfer`)
- Go to **Transfer** page.
- Select your registered asset from the dropdown.
- Enter Account #1's address (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
- Sign transaction in MetaMask.
- Switch to the public Verify page → Notice the titleholder is now Account #1 while the original Creator address remains permanently preserved for provenance!

---

## 🏛️ Architecture Details

| Layer | Implementation | Details |
|---|---|---|
| **Smart Contract** | `IPRegistry.sol` (Solidity 0.8.20) | Handles hashing registry, version lineages, ownership transfer, licensing updates |
| **Blockchain** | Hardhat Local EVM Node | Zero latency, zero cost, local consensus on port 8545 |
| **Off-Chain Storage** | Next.js API Route (`/api/ipfs`) | Deterministic multihash CIDv0 generator; serves files from local `/public/ipfs/` gateway |
| **Frontend** | Next.js 16 (App Router), React 19, ethers.js v6 | Cyber graphite & emerald UI with glassmorphism, responsive navigation, drag-and-drop |
| **Hashing** | Browser Web Crypto API (SHA-256) | Client-side cryptographic digesting without sending raw payloads over the network |

---

## ⚠️ Evidentiary Scope
As outlined in Slide 9 of the presentation:
*Blockchain proves that a particular hash was registered by a particular blockchain identity at an exact moment in time. The system establishes a tamper-evident evidentiary trail to complement legal authorship procedures.*
