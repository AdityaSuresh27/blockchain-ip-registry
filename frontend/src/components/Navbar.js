'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../context/WalletContext';

export default function Navbar() {
  const pathname = usePathname();
  const { 
    account, 
    balance, 
    activeDemoIndex,
    demoAccounts,
    connectDemoAccount,
    connectMetaMask,
    walletMode
  } = useWallet();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Register IP', href: '/register' },
    { label: 'Verify', href: '/verify' },
    { label: 'Transfer', href: '/transfer' },
    { label: 'Dashboard', href: '/dashboard' }
  ];

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <nav className="navbar">
      <Link href="/" className="brand-wrapper">
        <span className="brand-badge">
          <span>⚡</span> IP-REG
        </span>
        <div>
          <div className="brand-title">Blockchain IP Registry</div>
          <div className="brand-sub">PROVENANCE &bull; EVM &bull; IPFS</div>
        </div>
      </Link>

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

      <div className="nav-actions">
        {/* Network indicator */}
        <div className="network-pill" title="Connected to Local Hardhat EVM Node">
          <span className="status-dot"></span>
          <span>Localhost:8545</span>
        </div>

        {/* 1-Click Identity Selector (No extension required!) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            className="form-select"
            value={activeDemoIndex}
            onChange={(e) => connectDemoAccount(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.825rem',
              background: 'rgba(19, 28, 43, 0.9)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              marginBottom: 0
            }}
            title="Switch Simulated Test Account"
          >
            {demoAccounts.map((acc, idx) => (
              <option key={idx} value={idx} style={{ background: '#0d131d', color: '#fff' }}>
                👤 {acc.name}
              </option>
            ))}
          </select>

          {/* Account Balance & Address Pill */}
          {account && (
            <div 
              style={{
                background: 'rgba(19, 28, 43, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              <span style={{ color: 'var(--primary-emerald)', fontWeight: 600 }}>
                {parseFloat(balance).toFixed(1)} ETH
              </span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {formatAddress(account)}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
