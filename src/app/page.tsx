"use client";

import React, { useState, useCallback } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  TOKEN_PROGRAM_ID,
  burn,
  freezeAccount,
  thawAccount,
} from "@solana/spl-token";
import { useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

const network = WalletAdapterNetwork.Mainnet;
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

export default function Home() {
  const wallets = [new PhantomWalletAdapter()];

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <MintInterface />
      </WalletModalProvider>
    </WalletProvider>
  );
}

function MintInterface() {
  const { publicKey, sendTransaction, connected } = useWallet();

  // Token info states
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(0);
  const [uri, setUri] = useState(""); // Metadata URI
  
  // Status and error
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onMintClick = useCallback(async () => {
    try {
      setError(null);
      setStatus("Starting minting process...");
      if (!publicKey) throw new Error("Wallet not connected");

      // Create a new Keypair for mint authority (you can use your wallet for authority)
      const mintAuthority = Keypair.generate();

      // Airdrop is not possible on mainnet; you have to fund this keypair manually
      // For this example, we assume you supplied this keypair with SOL

      // Create the mint (token)
      setStatus("Creating mint...");
      const mint = await createMint(
        connection,
        mintAuthority, // payer
        mintAuthority.publicKey, // mint authority
        mintAuthority.publicKey, // freeze authority
        tokenDecimals
      );

      setStatus(`Mint created: ${mint.toBase58()}`);

      // Get or create ATA (associated token account) for connected wallet
      setStatus("Getting token account...");
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        mintAuthority,
        mint,
        publicKey
      );

      // Mint tokens to your wallet's token account
      setStatus("Minting tokens to your account...");
      await mintTo(
        connection,
        mintAuthority,
        mint,
        tokenAccount.address,
        mintAuthority,
        1 * 10 ** tokenDecimals
      );

      // Now revoke minting authority (set to null)
      setStatus("Revoking minting authority...");
      await setAuthority(
        connection,
        mintAuthority,
        mint,
        mintAuthority.publicKey,
        AuthorityType.MintTokens,
        null
      );

      // Revoke freeze authority (optional)
      setStatus("Revoking freezing authority...");
      await setAuthority(
        connection,
        mintAuthority,
        mint,
        mintAuthority.publicKey,
        AuthorityType.FreezeAccount,
        null
      );

      // Revoke token account close authority if needed (not shown here)

      // (Optional) Setup metadata via on-chain or off-chain URI handling
      // Generally, using Metaplex metadata program which needs custom instructions - advanced usage

      setStatus(`Token minted successfully!
Mint: ${mint.toBase58()}
Token Account: ${tokenAccount.address.toBase58()}
Metadata URI: ${uri}
`);

    } catch (err: any) {
      setError(err.message || "Error during minting");
      setStatus(null);
    }
  }, [publicKey, tokenDecimals, uri]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4 font-bold">Solana Token Minting (Mainnet Only)</h1>

      <WalletMultiButton />

      {!connected && <p className="mt-4 text-red-600">Connect your wallet to mint a token.</p>}

      {connected && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onMintClick();
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label>Token Name:</label>
            <input
              required
              type="text"
              className="border p-2 w-full"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Example Token"
            />
          </div>

          <div>
            <label>Token Symbol:</label>
            <input
              required
              type="text"
              maxLength={5}
              className="border p-2 w-full"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="EXMPL"
            />
          </div>

          <div>
            <label>Decimals (default 0):</label>
            <input
              type="number"
              min={0}
              max={9}
              className="border p-2 w-full"
              value={tokenDecimals}
              onChange={(e) => setTokenDecimals(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Metadata URI:</label>
            <input
              type="url"
              className="border p-2 w-full"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="https://arweave.net/your-metadata.json"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
            disabled={!tokenName || !tokenSymbol || !connected}
          >
            Mint Token
          </button>
        </form>
      )}

      {status && <p className="mt-4 text-green-600 whitespace-pre-line">{status}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}

