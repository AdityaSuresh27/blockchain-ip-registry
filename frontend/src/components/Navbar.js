'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../context/WalletContext';
import AccountManagerModal from './AccountManagerModal';

export default function Navbar() {
  const pathname = usePathname();
  const { 
    account, 
    balance, 
    activeAccountIndex,
    activeDemoIndex,
    currentAccount,
    accounts,
    demoAccounts,
    connectAccountByIndex,
    connectDemoAccount,
  } = useWallet();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const allAccounts = accounts || demoAccounts || [];
  const currentIndex = activeAccountIndex !== undefined ? activeAccountIndex : (activeDemoIndex || 0);

  const navItems = [
    { label: 'Home',      href: '/' },
    { label: 'Register',  href: '/register' },
    { label: 'Verify',    href: '/verify' },
    { label: 'Transfer',  href: '/transfer' },
    { label: 'Dashboard', href: '/dashboard' },
  ];

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleSelectAccount = (idx) => {
    if (connectAccountByIndex) {
      connectAccountByIndex(idx);
    } else if (connectDemoAccount) {
      connectDemoAccount(idx);
    }
  };

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <Link href="/" className="brand-wrapper">
          <span className="brand-badge">⚡ IP·REG</span>
          <div>
            <div className="brand-title">Blockchain IP Registry</div>
            <div className="brand-sub">EVM · IPFS · SHA-256</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Network Indicator */}
          <div className="network-pill" title="Connected to Local Hardhat EVM — port 8545">
            <span className="status-dot" />
            <span>Hardhat EVM</span>
          </div>

          {/* Account Selector Dropdown */}
          <select
            className="identity-select"
            value={currentIndex}
            onChange={(e) => handleSelectAccount(Number(e.target.value))}
            title="Quickly switch simulated identity"
          >
            {allAccounts.map((acc, idx) => (
              <option key={idx} value={idx} style={{ background: '#0f1724', color: '#edf2f8' }}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Manage / Add Accounts Button */}
          <button
            className="btn-manage-accounts"
            onClick={() => setIsAccountModalOpen(true)}
            title="Add, import, or manage blockchain accounts"
          >
            <span>➕ Accounts</span>
          </button>

          {/* Account Chip */}
          {account && (
            <div className="account-chip" onClick={() => setIsAccountModalOpen(true)} style={{ cursor: 'pointer' }} title="Click to manage accounts">
              <span className="account-balance">{parseFloat(balance).toFixed(1)} ETH</span>
              <span className="account-divider" />
              <span className="account-address">{formatAddress(account)}</span>
            </div>
          )}
        </div>
      </nav>

      {/* Account Manager Modal */}
      <AccountManagerModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
}
