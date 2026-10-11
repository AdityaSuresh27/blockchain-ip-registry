'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import contractAddress from '../contracts/contract-address.json';
import IPRegistryArtifact from '../contracts/IPRegistry.json';

export default function Home() {
  const { account, provider, readOnlyProvider, connectWallet } = useWallet();
  const [totalRecords, setTotalRecords] = useState(null);
  const [latestBlock, setLatestBlock] = useState(null);
  const [recentHashes, setRecentHashes] = useState([]);
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

        const hashes = await contract.getAllHashes();
        setRecentHashes(hashes.slice(-3).reverse());
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
      desc: 'Upload any digital asset (code, research, designs, audio) and record its immutable fingerprint on-chain.'
    },
    {
      icon: '⏱️',
      title: 'Timestamped Proof',
      desc: 'Cryptographic block timestamping provides indisputable evidentiary proof of creation and existence.'
    },
    {
      icon: '✓',
      title: 'Authenticity Check',
      desc: 'Re-hash any digital file locally to verify whether it matches an authentic, untampered on-chain registry record.'
    },
    {
      icon: '↻',
      title: 'Version History',
      desc: 'Track every revision, update, and release as an immutable linked chain of cryptographic parent-child versions.'
    },
    {
      icon: '⇄',
      title: 'Ownership Transfer',
      desc: 'Transfer intellectual property title rights between wallet identities with cryptographic non-repudiation.'
    },
    {
      icon: '📜',
      title: 'Digital Licensing',
      desc: 'Attach machine-readable licensing agreements (MIT, Apache, CC, Custom) and update terms transparently.'
    },
    {
      icon: '⚠️',
      title: 'Duplicate Detection',
      desc: 'Automated pre-flight collision checks flag identical cryptographic hashes, preventing fraudulent duplicate claims.'
    },
    {
      icon: '🔍',
      title: 'Public Verification',
      desc: 'Completely open verification portal — anyone, anywhere can audit claims independently without signing in.'
    }
  ];

  return (
    <div className="container">
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3.5rem 0 2.5rem 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <span className="badge badge-success">● EVM Consensus</span>
          <span className="badge badge-info">InterPlanetary File System (IPFS)</span>
          <span className="badge badge-warning">SHA-256 Cryptographic Hash</span>
        </div>

        <h1 className="hero-title">
          Decentralized Intellectual Property <br />
          <span className="gradient-text">Provenance & Licensing System</span>
        </h1>

        <p className="subtitle" style={{ margin: '0 auto 2.5rem auto' }}>
          A tamper-evident, publicly auditable platform for registering creative works, maintaining version trails, 
          managing licensing rights, and establishing independent proof of existence on the blockchain.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
            <span>⚡</span> Register Digital IP
          </Link>
          <Link href="/verify" className="btn btn-secondary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
            <span>🔍</span> Verify Any Asset
          </Link>
          <Link href="/dashboard" className="btn btn-outline" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
            <span>📊</span> IP Portfolio
          </Link>
        </div>
      </section>

      {/* Live Node Telemetry Stats */}
      <section style={{ margin: '1.5rem 0 3rem 0' }}>
        <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Blockchain Network
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-emerald)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="status-dot"></span> Hardhat EVM (Local)
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Registered Assets
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isLoadingStats ? '...' : (totalRecords !== null ? totalRecords : '0')}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Current Block
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {latestBlock !== null ? `#${latestBlock}` : '...'}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Contract Address
              </div>
              <div className="hash-pill" style={{ marginTop: '0.2rem' }}>
                {contractAddress.IPRegistry ? `${contractAddress.IPRegistry.substring(0, 10)}...${contractAddress.IPRegistry.substring(34)}` : '0x...'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Core Features Grid */}
      <section style={{ margin: '3.5rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Eight Pillars of Digital Provenance
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Built strictly in accordance with the Decentralized IP Provenance architectural specifications.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-box">{f.icon}</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture & Flow Section */}
      <section style={{ margin: '4rem 0' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            System Architecture: On-Chain Proof vs Off-Chain Storage
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div style={{ background: 'rgba(8, 12, 19, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <span className="badge badge-success">ON-CHAIN (Solidity Smart Contract)</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li>🔒 Fixed 32-byte SHA-256 Cryptographic Hash</li>
                <li>👤 Creator & Current Owner Wallet Addresses</li>
                <li>⏱️ Immutable Block Timestamp (Proof of Existence)</li>
                <li>↻ Version Lineage & Parent-Child Pointers</li>
                <li>📜 Machine-Readable Licensing Agreements</li>
                <li>⇄ Non-repudiable Ownership Transfer Log</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(8, 12, 19, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <span className="badge badge-info">OFF-CHAIN (InterPlanetary File System)</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li>📦 Full Unmodified Digital Asset Payloads</li>
                <li>🖼️ High-Resolution Media, Codebases, Documents</li>
                <li>🔗 Content-Addressed CIDs (Deterministic URI)</li>
                <li>⚡ Zero Gas Cost Storage Overhead</li>
                <li>🌐 Decentralized P2P Retrieval Guarantee</li>
                <li>🛡️ Cryptographically Verifiable Payload Match</li>
              </ul>
            </div>
          </div>

          {/* Evidentiary Notice matching Slide 9 */}
          <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', color: 'var(--warning)', fontWeight: 600, fontSize: '0.9rem' }}>
              <span>⚠️</span> Evidentiary Scope & Legal Notice
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Blockchain proves that a particular hash was registered by a particular blockchain identity at an exact moment in time. 
              The system establishes a tamper-evident, cryptographic audit trail that serves as robust technical evidence to complement legal authorship and copyright procedures.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
