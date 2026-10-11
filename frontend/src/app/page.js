'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import contractAddress from '../contracts/contract-address.json';
import IPRegistryArtifact from '../contracts/IPRegistry.json';

export default function Home() {
  const { provider, readOnlyProvider } = useWallet();
  const [totalRecords, setTotalRecords]   = useState(null);
  const [latestBlock,  setLatestBlock]    = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function loadBlockchainStats() {
      const activeProvider = provider || readOnlyProvider;
      if (!activeProvider) return;

      try {
        const block = await activeProvider.getBlockNumber();
        setLatestBlock(block);

        const contract = new ethers.Contract(
          contractAddress.IPRegistry,
          IPRegistryArtifact.abi,
          activeProvider
        );

        const count = await contract.getTotalRecordCount();
        setTotalRecords(Number(count));
      } catch (err) {
        console.warn('Could not read contract stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadBlockchainStats();
    const interval = setInterval(loadBlockchainStats, 10000);
    return () => clearInterval(interval);
  }, [provider, readOnlyProvider]);

  const features = [
    {
      icon: '🛡️',
      title: 'IP Registration',
      desc: 'Upload any digital asset and record its immutable SHA-256 fingerprint on-chain.'
    },
    {
      icon: '⏱️',
      title: 'Timestamped Proof',
      desc: 'Cryptographic block timestamps provide indisputable proof of creation and existence.'
    },
    {
      icon: '✓',
      title: 'Authenticity Check',
      desc: 'Re-hash any file locally to verify it matches an authentic, untampered on-chain record.'
    },
    {
      icon: '↻',
      title: 'Version History',
      desc: 'Track every revision as an immutable linked chain of cryptographic parent-child versions.'
    },
    {
      icon: '⇄',
      title: 'Ownership Transfer',
      desc: 'Transfer IP title rights between wallet identities with cryptographic non-repudiation.'
    },
    {
      icon: '📜',
      title: 'Digital Licensing',
      desc: 'Attach machine-readable licensing agreements and update terms transparently on-chain.'
    },
    {
      icon: '⚠️',
      title: 'Duplicate Detection',
      desc: 'Pre-flight collision checks flag identical hashes, preventing fraudulent duplicate claims.'
    },
    {
      icon: '🔍',
      title: 'Public Verification',
      desc: 'Open verification portal — anyone can audit claims independently without logging in.'
    }
  ];

  const shortContract = contractAddress.IPRegistry
    ? `${contractAddress.IPRegistry.substring(0, 10)}...${contractAddress.IPRegistry.substring(34)}`
    : '0x...';

  return (
    <div className="container">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '4rem 0 3.5rem' }}>

        <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
          <span className="status-dot" />
          Decentralized · EVM-Compatible · SHA-256 Secured
        </div>

        <h1 className="hero-title">
          Register &amp; Prove<br />
          <span className="gradient-text">Intellectual Property</span>
        </h1>

        <p className="subtitle" style={{ margin: '0 auto 2.5rem' }}>
          Anchor creative works to the blockchain. Establish verifiable proof of existence,
          manage licensing rights, and maintain an immutable version history — all on-chain.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
            ⚡ Register Digital IP
          </Link>
          <Link href="/verify" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
            🔍 Verify an Asset
          </Link>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
            📊 My Portfolio
          </Link>
        </div>
      </section>

      {/* ── Live Stats ────────────────────────────────────── */}
      <section style={{ marginBottom: '5rem' }}>
        <div className="glass-panel" style={{ padding: '1.75rem 2.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1px auto 1px auto 1px auto',
            alignItems: 'center',
            gap: '0 2.5rem',
          }}>

            {/* Network */}
            <div>
              <div className="stat-label">Network</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="status-dot" />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-emerald)' }}>
                  Hardhat EVM
                </span>
              </div>
            </div>

            <div style={{ height: '40px', background: 'var(--border-subtle)' }} />

            {/* Registered Assets */}
            <div>
              <div className="stat-label">Registered Assets</div>
              <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                {isLoadingStats ? '—' : (totalRecords ?? 0)}
              </div>
            </div>

            <div style={{ height: '40px', background: 'var(--border-subtle)' }} />

            {/* Block Height */}
            <div>
              <div className="stat-label">Block Height</div>
              <div className="stat-value" style={{
                marginTop: '0.25rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)',
                fontSize: '1.6rem',
              }}>
                {latestBlock !== null ? `#${latestBlock}` : '—'}
              </div>
            </div>

            <div style={{ height: '40px', background: 'var(--border-subtle)' }} />

            {/* Contract */}
            <div>
              <div className="stat-label">Contract Address</div>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="hash-pill">{shortContract}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 8-Feature Grid ────────────────────────────────── */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
            Core Capabilities
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: '0.5rem' }}>
            Eight Pillars of Digital Provenance
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', fontSize: '0.95rem' }}>
            Built strictly in accordance with the Decentralized IP Provenance architectural specification.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-box">{f.icon}</div>
              <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture ──────────────────────────────────── */}
      <section style={{ marginBottom: '4rem' }}>
        <div className="glass-panel">

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
              System Architecture
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.035em' }}>
              On-Chain Proof · Off-Chain Storage
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

            <div style={{
              background: 'rgba(0,229,160,0.04)',
              border: '1px solid rgba(0,229,160,0.14)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <span className="badge badge-success">On-Chain — Solidity Smart Contract</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <li>🔒 Fixed 32-byte SHA-256 cryptographic hash</li>
                <li>👤 Creator &amp; owner wallet addresses</li>
                <li>⏱️ Immutable block timestamp — proof of existence</li>
                <li>↻ Version lineage &amp; parent-child pointers</li>
                <li>📜 Machine-readable licensing agreements</li>
                <li>⇄ Non-repudiable ownership transfer log</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(34,211,238,0.04)',
              border: '1px solid rgba(34,211,238,0.14)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <span className="badge badge-info">Off-Chain — InterPlanetary File System</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <li>📦 Full unmodified digital asset payloads</li>
                <li>🖼️ High-resolution media, codebases, documents</li>
                <li>🔗 Content-addressed CIDs — deterministic URIs</li>
                <li>⚡ Zero gas cost storage overhead</li>
                <li>🌐 Decentralized P2P retrieval</li>
                <li>🛡️ Cryptographically verifiable payload match</li>
              </ul>
            </div>

          </div>

          {/* Evidentiary notice */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--warning)', marginBottom: '0.25rem' }}>
                Evidentiary Scope &amp; Legal Notice
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                Blockchain proves that a particular hash was registered by a particular identity at an exact moment in time.
                This establishes a tamper-evident cryptographic audit trail that serves as technical evidence to complement legal authorship procedures.
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
