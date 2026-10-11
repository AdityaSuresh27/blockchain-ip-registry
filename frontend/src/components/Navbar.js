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
    isConnecting, 
    isLocalNetwork, 
    connectWallet, 
    disconnectWallet,
    switchToLocalNetwork 
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

        {/* Network warning if not on local node */}
        {account && !isLocalNetwork && (
          <button 
            className="btn btn-danger" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={switchToLocalNetwork}
          >
            Switch to Hardhat (31337)
          </button>
        )}

        {/* Wallet action */}
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                {parseFloat(balance).toFixed(2)} ETH
              </span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {formatAddress(account)}
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              onClick={disconnectWallet}
              title="Disconnect Wallet"
            >
              ✕
            </button>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
}
