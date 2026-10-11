'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';

// Pre-funded demo accounts from local Hardhat node (10,000 ETH each)
// Allows 1-click simulation without installing any browser extensions!
export const DEMO_ACCOUNTS = [
  {
    name: 'Alice (Creator / Author)',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    role: 'Author & First Registrant'
  },
  {
    name: 'Bob (Buyer / Licensee)',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    role: 'Transferee / Titleholder'
  },
  {
    name: 'Charlie (Independent Auditor)',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    role: 'Third-Party Verifier'
  }
];

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(HARDHAT_CHAIN_ID);
  const [balance, setBalance] = useState('10000.0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [readOnlyProvider, setReadOnlyProvider] = useState(null);
  const [walletMode, setWalletMode] = useState('demo'); // 'demo' or 'metamask'
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);

  // Initialize read-only provider for public lookups
  useEffect(() => {
    try {
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      setReadOnlyProvider(rpc);
    } catch (e) {
      console.warn('Could not initialize read-only RPC provider:', e);
    }
  }, []);

  // Connect using built-in demo account (NO extension needed!)
  const connectDemoAccount = useCallback(async (index = 0) => {
    try {
      setIsConnecting(true);
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const demoAccount = DEMO_ACCOUNTS[index] || DEMO_ACCOUNTS[0];
      const walletSigner = new ethers.Wallet(demoAccount.privateKey, rpc);

      setProvider(rpc);
      setSigner(walletSigner);
      setAccount(demoAccount.address);
      setActiveDemoIndex(index);
      setWalletMode('demo');
      setChainId(HARDHAT_CHAIN_ID);

      try {
        const bal = await rpc.getBalance(demoAccount.address);
        setBalance(ethers.formatEther(bal));
      } catch (e) {
        setBalance('10000.0');
      }
    } catch (err) {
      console.error('Failed to connect demo account:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Update account when using MetaMask
  const updateAccountData = useCallback(async (selectedAccount, browserProvider) => {
    try {
      setAccount(selectedAccount);
      const currentSigner = await browserProvider.getSigner();
      setSigner(currentSigner);

      const network = await browserProvider.getNetwork();
      setChainId('0x' + network.chainId.toString(16));

      const bal = await browserProvider.getBalance(selectedAccount);
      setBalance(ethers.formatEther(bal));
      setWalletMode('metamask');
    } catch (err) {
      console.error('Error updating account data:', err);
    }
  }, []);

  // Auto-connect to Alice (Demo Account #0) on initial load for instant zero-friction usability!
  useEffect(() => {
    connectDemoAccount(0);
  }, [connectDemoAccount]);

  // Listen for MetaMask changes if installed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && walletMode === 'metamask') {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          updateAccountData(accounts[0], browserProvider);
        } else {
          connectDemoAccount(0);
        }
      };

      const handleChainChanged = (newChainId) => {
        setChainId(newChainId);
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [updateAccountData, walletMode, connectDemoAccount]);

  // Connect via MetaMask (optional)
  const connectMetaMask = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask browser extension not detected. You can use the built-in 1-Click Demo Accounts instead!');
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await updateAccountData(accounts[0], browserProvider);
      }
    } catch (error) {
      console.error('MetaMask connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance('0');
  };

  const isLocalNetwork = chainId === HARDHAT_CHAIN_ID || chainId === '0x7a69' || chainId === 31337;

  return (
    <WalletContext.Provider value={{
      account,
      provider,
      signer,
      chainId,
      balance,
      isConnecting,
      readOnlyProvider,
      isLocalNetwork,
      walletMode,
      activeDemoIndex,
      demoAccounts: DEMO_ACCOUNTS,
      connectDemoAccount,
      connectMetaMask,
      connectWallet: () => connectDemoAccount(0),
      disconnectWallet
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
