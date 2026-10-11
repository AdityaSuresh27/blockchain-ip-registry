'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';

// Pre-funded test accounts on local node (10,000 ETH each):
export const DEFAULT_ACCOUNTS = [
  {
    name: 'Alice (Account #1)',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    description: 'Creator / Rights-Holder #1'
  },
  {
    name: 'Bob (Account #2)',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    description: 'Creator / Rights-Holder #2'
  },
  {
    name: 'Charlie (Account #3)',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    description: 'Creator / Rights-Holder #3'
  }
];

export const DEMO_ACCOUNTS = DEFAULT_ACCOUNTS;

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
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [customAccounts, setCustomAccounts] = useState([]);

  // Load custom accounts from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('custom_blockchain_accounts');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomAccounts(parsed);
          }
        }
      } catch (e) {
        console.warn('Could not read custom accounts from localStorage:', e);
      }
    }
  }, []);

  const allAccounts = [...DEFAULT_ACCOUNTS, ...customAccounts];

  // Initialize read-only provider for public lookups
  useEffect(() => {
    try {
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      setReadOnlyProvider(rpc);
    } catch (e) {
      console.warn('Could not initialize read-only RPC provider:', e);
    }
  }, []);

  // Connect by index in the unified accounts list
  const connectAccountByIndex = useCallback(async (index = 0, accountsList = null) => {
    const list = accountsList || [...DEFAULT_ACCOUNTS, ...customAccounts];
    try {
      setIsConnecting(true);
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const selected = list[index] || list[0];
      const walletSigner = new ethers.Wallet(selected.privateKey, rpc);

      setProvider(rpc);
      setSigner(walletSigner);
      setAccount(selected.address);
      setActiveAccountIndex(index);
      setWalletMode('demo');
      setChainId(HARDHAT_CHAIN_ID);

      try {
        const bal = await rpc.getBalance(selected.address);
        setBalance(ethers.formatEther(bal));
      } catch (e) {
        setBalance('10000.0');
      }
    } catch (err) {
      console.error('Failed to connect account:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [customAccounts]);

  // Connect using built-in account (backwards compatible alias)
  const connectDemoAccount = useCallback(async (index = 0) => {
    return connectAccountByIndex(index);
  }, [connectAccountByIndex]);

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

  // Auto-connect to Alice (Demo Account #0) on initial load
  useEffect(() => {
    connectAccountByIndex(0);
  }, [connectAccountByIndex]);

  // Listen for MetaMask changes if installed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && walletMode === 'metamask') {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          updateAccountData(accounts[0], browserProvider);
        } else {
          connectAccountByIndex(0);
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
  }, [updateAccountData, walletMode, connectAccountByIndex]);

  // Connect via MetaMask (optional)
  const connectMetaMask = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask browser extension not detected. You can use the built-in 1-Click Simulated Accounts instead!');
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

  // Add a brand new randomly generated account and auto-fund with 10 ETH from Alice
  const createRandomAccount = async (name = '', role = 'Custom Account') => {
    try {
      setIsConnecting(true);
      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const randomWallet = ethers.Wallet.createRandom();

      // Attempt to auto-fund with 10 ETH from Alice (Account 0) so it can pay gas immediately
      try {
        const alice = new ethers.Wallet(DEFAULT_ACCOUNTS[0].privateKey, rpc);
        const tx = await alice.sendTransaction({
          to: randomWallet.address,
          value: ethers.parseEther('10.0')
        });
        await tx.wait();
      } catch (fundingErr) {
        console.warn('Auto-funding new account failed (node might be starting or non-local):', fundingErr);
      }

      const newAccountObj = {
        name: name.trim() || `Wallet #${allAccounts.length + 1}`,
        address: randomWallet.address,
        privateKey: randomWallet.privateKey,
        role: role.trim() || 'Created User Wallet',
        isCustom: true
      };

      const updatedCustom = [...customAccounts, newAccountObj];
      setCustomAccounts(updatedCustom);
      if (typeof window !== 'undefined') {
        localStorage.setItem('custom_blockchain_accounts', JSON.stringify(updatedCustom));
      }

      const newIdx = DEFAULT_ACCOUNTS.length + updatedCustom.length - 1;
      await connectAccountByIndex(newIdx, [...DEFAULT_ACCOUNTS, ...updatedCustom]);
      return { success: true, account: newAccountObj };
    } catch (err) {
      console.error('Failed to create random account:', err);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  // Import an account by private key
  const importAccount = async (name, privateKey, role = 'Imported Account') => {
    try {
      setIsConnecting(true);
      let cleanKey = privateKey.trim();
      if (!cleanKey.startsWith('0x')) {
        cleanKey = '0x' + cleanKey;
      }

      const rpc = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const wallet = new ethers.Wallet(cleanKey, rpc);

      // Check if already in list
      const exists = allAccounts.some(
        a => a.address.toLowerCase() === wallet.address.toLowerCase()
      );
      if (exists) {
        throw new Error('This account address or private key is already added.');
      }

      // Check balance and auto-fund with 10 ETH if empty on local dev node
      try {
        const currentBal = await rpc.getBalance(wallet.address);
        if (currentBal === 0n) {
          const alice = new ethers.Wallet(DEFAULT_ACCOUNTS[0].privateKey, rpc);
          const tx = await alice.sendTransaction({
            to: wallet.address,
            value: ethers.parseEther('10.0')
          });
          await tx.wait();
        }
      } catch (fundErr) {
        console.warn('Auto-fund check error:', fundErr);
      }

      const newAccountObj = {
        name: name.trim() || `Imported (${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)})`,
        address: wallet.address,
        privateKey: cleanKey,
        role: role.trim() || 'Imported Private Key',
        isCustom: true
      };

      const updatedCustom = [...customAccounts, newAccountObj];
      setCustomAccounts(updatedCustom);
      if (typeof window !== 'undefined') {
        localStorage.setItem('custom_blockchain_accounts', JSON.stringify(updatedCustom));
      }

      const newIdx = DEFAULT_ACCOUNTS.length + updatedCustom.length - 1;
      await connectAccountByIndex(newIdx, [...DEFAULT_ACCOUNTS, ...updatedCustom]);
      return { success: true, account: newAccountObj };
    } catch (err) {
      console.error('Failed to import account:', err);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  // Delete a custom account
  const removeCustomAccount = (addressToRemove) => {
    const updatedCustom = customAccounts.filter(
      a => a.address.toLowerCase() !== addressToRemove.toLowerCase()
    );
    setCustomAccounts(updatedCustom);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_blockchain_accounts', JSON.stringify(updatedCustom));
    }
    // If active account was removed, switch back to Alice
    if (account && account.toLowerCase() === addressToRemove.toLowerCase()) {
      connectAccountByIndex(0, [...DEFAULT_ACCOUNTS, ...updatedCustom]);
    }
  };

  // Refresh current balance from node
  const refreshBalance = useCallback(async () => {
    if (!account) return;
    try {
      const activeRpc = provider || new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const bal = await activeRpc.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (e) {
      console.warn('Could not refresh balance:', e);
    }
  }, [account, provider]);

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance('0');
  };

  const isLocalNetwork = chainId === HARDHAT_CHAIN_ID || chainId === '0x7a69' || chainId === 31337;
  const currentAccount = allAccounts[activeAccountIndex] || allAccounts[0];
  const currentRole = currentAccount?.id || 'creator';
  const canRegister = currentAccount?.canRegister !== false;
  const canTransfer = currentAccount?.canTransfer !== false;

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
      activeDemoIndex: activeAccountIndex,
      activeAccountIndex,
      currentAccount,
      currentRole,
      canRegister,
      canTransfer,
      demoAccounts: allAccounts,
      accounts: allAccounts,
      connectAccountByIndex,
      connectDemoAccount,
      createRandomAccount,
      importAccount,
      removeCustomAccount,
      refreshBalance,
      connectMetaMask,
      connectWallet: () => connectAccountByIndex(0),
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
