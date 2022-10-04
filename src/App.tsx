
// importfunctionalities
import React from 'react';
import logo from './logo.svg';
import './App.css';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

/**
 * Connecion to the network
 */
let connection: Connection;

/**
 * fromAirDropSignature
 */
let fromAirDropSignature: string;

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

// Get the wallet balance
const getWalletBalance = async (publicKey: String) => {
  const walletBalance = await connection.getBalance(
    new PublicKey(publicKey)
  );
  return walletBalance
};

function App() {
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  // create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  // create state variable for the new KeyPair publicKey
  const [newKeyPair, setNewKeyPair] = useState<Keypair | undefined>(
    undefined
  );

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    const provider = getProvider();

    // if the phantom provider exists, set this as the provider
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  /**
   * Generate an account
   */
  const createNewKeypair = async () => {
    // await setNewKeypair();
    connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const newKeypair = Keypair.generate();
    console.log("Public Key of New keypair is:", newKeypair.publicKey.toString());

    fromAirDropSignature = await connection.requestAirdrop(
      newKeypair.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(fromAirDropSignature);

    const walletBalance = await getWalletBalance(newKeypair.publicKey.toString());
    console.log(`New keypair wallet balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);

    setNewKeyPair(newKeypair);
  }

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the connect wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        // connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());

        // Get the "to" wallet balance
        let toBalance = await getWalletBalance(response.publicKey.toString());
        console.log(`${walletKey}: ${toBalance / LAMPORTS_PER_SOL} SOL`);

        // update walletKey to be the public key
        setWalletKey(response.publicKey.toString());

      } catch (err) {
        console.log(err);
      }
    }
  };

  /**
   * Transfer o the account connected
   */
  const transferSol = async () => {
    if (newKeyPair && walletKey) {
      // gas
      const fromAirDropSignature = await connection.requestAirdrop(
        newKeyPair.publicKey,
        0.01 * LAMPORTS_PER_SOL,
      );
      console.log(`Airdopping GAS: 0.01 SOL`);

      console.log("Airdopping some SOL to Sender wallet!");

      // Latest blockhash (unique identifer of the block) of the cluster
      let latestBlockHash = await connection.getLatestBlockhash();

      // Confirm transaction using the last valid block height (refers to its time)
      // to check for transaction expiration
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: fromAirDropSignature
      });

      console.log("Airdrop completed for the Sender account");

      try {
        // Send money from "from" wallet and into "to" wallet
        let transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: newKeyPair.publicKey,
            toPubkey: new PublicKey(walletKey.toString()),
            lamports: 2 * LAMPORTS_PER_SOL
          })
        );

        // Sign transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [newKeyPair]
        );
        console.log('Signature is ', signature);

      } catch (err) {
        console.log(err);
      }

      // Get the "to" wallet balance
      let toBalance = await getWalletBalance(walletKey.toString());
      console.log(`${walletKey}: ${toBalance / LAMPORTS_PER_SOL} SOL`);
    } else {
      console.log('wallet not found');
    }
  };

  // HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        {!newKeyPair && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createNewKeypair}
          >
            Create a new Solana account
          </button>
        )}
        {newKeyPair && (
          <p>Public Key of new keypair is: {newKeyPair.publicKey.toString()}</p>
        )}
        {walletKey && (
          <p>Connected account: {walletKey.toString()}</p>
        )}
        {newKeyPair && provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect to Phantom Wallet
          </button>
        )}
        {newKeyPair && provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={transferSol}
          >
            Transfer to new wallet
          </button>
        )}
        {newKeyPair && !provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}

export default App;
