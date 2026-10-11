'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [readOnlyProvider, setReadOnlyProvider] = useState(null);

  // Initialize read-only provider for public lookups (works without wallet)
  useEffect(() => {
    try {
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      setReadOnlyProvider(rpc);
    } catch (e) {
      console.warn('Could not initialize read-only RPC provider:', e);
    }
  }, []);

  const updateAccountData = useCallback(async (selectedAccount, browserProvider) => {
    try {
      setAccount(selectedAccount);
      const currentSigner = await browserProvider.getSigner();
      setSigner(currentSigner);

      const network = await browserProvider.getNetwork();
      setChainId('0x' + network.chainId.toString(16));

      const bal = await browserProvider.getBalance(selectedAccount);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error('Error updating account data:', err);
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts) => {
          if (accounts.length > 0) {
            updateAccountData(accounts[0], browserProvider);
          }
        })
        .catch(console.error);

      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          updateAccountData(accounts[0], browserProvider);
        } else {
          setAccount(null);
          setSigner(null);
          setBalance('0');
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
  }, [updateAccountData]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask or an EVM wallet is required for on-chain transactions.\n\nTip: You can still use the Public Verification page without any wallet!');
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
      console.error('Wallet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToLocalNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    } catch (switchError) {
      // Chain not added yet, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: HARDHAT_CHAIN_ID,
              chainName: 'Hardhat Local Node',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [HARDHAT_RPC_URL],
            }],
          });
        } catch (addError) {
          console.error('Failed to add Hardhat network:', addError);
        }
      }
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
      connectWallet,
      disconnectWallet,
      switchToLocalNetwork
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
