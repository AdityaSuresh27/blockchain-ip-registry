'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { downloadIPFSFile } from '../../utils/downloadHelper';
import contractAddress from '../../contracts/contract-address.json';
import IPRegistryArtifact from '../../contracts/IPRegistry.json';

export default function DashboardPage() {
  const { account, signer, provider, readOnlyProvider, connectWallet, currentAccount, connectAccountByIndex } = useWallet();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLicenseHash, setEditingLicenseHash] = useState(null);
  const [newLicenseTerms, setNewLicenseTerms] = useState('');
  const [isUpdatingLicense, setIsUpdatingLicense] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'owned', 'created'

  const loadPortfolio = useCallback(async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      const activeProvider = provider || readOnlyProvider || new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        activeProvider
      );

      // Fetch all hashes to include both created assets and assets acquired via transfer
      const hashSet = new Set();
      try {
        const allHashes = await contract.getAllHashes();
        allHashes.forEach(h => hashSet.add(h));
      } catch (e) {
        console.warn('getAllHashes failed, falling back:', e);
      }
      try {
        const creatorHashes = await contract.getCreatorRecords(account);
        creatorHashes.forEach(h => hashSet.add(h));
      } catch (e) {
        console.warn('getCreatorRecords failed:', e);
      }

      const loaded = [];

      for (const h of hashSet) {
        try {
          const rec = await contract.verifyIP(h);
          if (rec.exists) {
            const isOwner = rec.owner && rec.owner.toLowerCase() === account.toLowerCase();
            const isCreator = rec.creator && rec.creator.toLowerCase() === account.toLowerCase();

            if (isOwner || isCreator) {
              // Check subsequent revisions
              let children = [];
              try {
                children = await contract.getSubsequentVersions(h);
              } catch (e) {
                console.warn(e);
              }

              loaded.push({
                hash: h,
                creator: rec.creator,
                owner: rec.owner,
                timestamp: new Date(Number(rec.timestamp) * 1000).toLocaleString(),
                version: Number(rec.version),
                license: rec.licenseTerms,
                ipfsURI: rec.ipfsURI,
                gatewayURL: rec.ipfsURI.replace('ipfs://', '/ipfs/'),
                previousVersionHash: rec.previousVersionHash !== ethers.ZeroHash ? rec.previousVersionHash : null,
                subsequentVersions: children,
                isOwner,
                isCreator
              });
            }
          }
        } catch (recErr) {
          console.warn('Error reading record for hash', h, recErr);
        }
      }
      setRecords(loaded.reverse());
    } catch (err) {
      console.warn('Error loading portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account, provider, readOnlyProvider]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleUpdateLicense = async (hash) => {
    if (!signer || !newLicenseTerms.trim()) return;

    try {
      setIsUpdatingLicense(true);
      setStatusMessage('Prompting MetaMask for license update...');

      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        signer
      );

      const tx = await contract.updateLicenseTerms(hash, newLicenseTerms.trim());
      setStatusMessage('Mining license update on blockchain...');
      await tx.wait();

      setStatusMessage('License terms updated successfully!');
      setEditingLicenseHash(null);
      setNewLicenseTerms('');
      await loadPortfolio();
    } catch (err) {
      console.error('License update failed:', err);
      alert(`License update failed: ${err.reason || err.message}`);
    } finally {
      setIsUpdatingLicense(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            My Intellectual Property Portfolio
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage registered digital works, licensing terms, version chains, and legal title transfers for {currentAccount?.name || 'your account'}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/register" className="btn btn-primary">
            <span>+</span> Register New IP
          </Link>
          <button className="btn btn-secondary" onClick={loadPortfolio} disabled={isLoading}>
            <span>↻</span> Refresh
          </button>
        </div>
      </div>

      {!account ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Connect Wallet to View Portfolio
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            Your on-chain assets are linked to your cryptographic wallet address. Connect MetaMask to view and manage them.
          </p>
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      ) : isLoading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <span className="status-dot"></span>
          <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>
            Reading portfolio records from blockchain...
          </span>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            No Registered Assets Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            No intellectual property records are registered or owned by wallet address{' '}
            <span className="hash-pill">{account.substring(0, 10)}...</span> yet. Upload a work to secure your copyright on-chain!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/register" className="btn btn-primary">
              Register Your First Work
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {statusMessage && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary-emerald)', fontSize: '0.9rem' }}>
              {statusMessage}
            </div>
          )}

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <button
              className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('all')}
            >
              All Portfolio Assets ({records.length})
            </button>
            <button
              className={`btn btn-sm ${activeFilter === 'owned' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('owned')}
            >
              Active Legal Title ({records.filter(r => r.isOwner).length})
            </button>
            <button
              className={`btn btn-sm ${activeFilter === 'created' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('created')}
            >
              Original Creations ({records.filter(r => r.isCreator).length})
            </button>
          </div>

          {records
            .filter(item => {
              if (activeFilter === 'owned') return item.isOwner;
              if (activeFilter === 'created') return item.isCreator;
              return true;
            })
            .map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-success">Version {item.version}.0</span>
                  
                  {item.isOwner ? (
                    item.isCreator ? (
                      <span className="badge badge-success">🏆 Original Author & Legal Owner</span>
                    ) : (
                      <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.18)', border: '1px solid var(--primary-emerald)' }}>
                        🏆 Legal Owner (Acquired via Transfer)
                      </span>
                    )
                  ) : (
                    <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                      📜 Original Author (Title Transferred)
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Registered on {item.timestamp}
                </div>
              </div>

              {/* Ownership Transferred Warning for Non-Owners */}
              {!item.isOwner && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#fcd34d', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>ℹ️</span>
                  <div>
                    <strong>Ownership Transferred:</strong> You are permanently recorded as the original creator. However, legal ownership was transferred to <span className="mono">{item.owner}</span>. Only the current owner has the cryptographic authority to transfer ownership, update licenses, or publish revisions.
                  </div>
                </div>
              )}

              {/* SHA-256 Hash */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Cryptographic File Hash (SHA-256):
                </div>
                <div className="hash-pill" style={{ width: '100%', wordBreak: 'break-all' }}>
                  {item.hash}
                </div>
              </div>

              {/* Current Titleholder & Creator Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Original Creator:</span>
                  <div className="mono" style={{ fontSize: '0.8rem', color: item.isCreator ? '#34d399' : 'var(--text-secondary)' }}>
                    {item.creator} {item.isCreator && '(You)'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Legal Titleholder:</span>
                  <div className="mono" style={{ fontSize: '0.8rem', color: item.isOwner ? '#34d399' : '#fbbf24' }}>
                    {item.owner} {item.isOwner && '(You)'}
                  </div>
                </div>
              </div>

              {/* Version Parent Lineage */}
              {item.previousVersionHash && (
                <div style={{ marginBottom: '1rem', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Predecessor Version Hash: </span>
                  <Link href={`/verify?hash=${item.previousVersionHash}`} className="hash-pill" style={{ textDecoration: 'none' }}>
                    {item.previousVersionHash.substring(0, 20)}... ↗
                  </Link>
                </div>
              )}

              {/* IPFS Off-chain URI */}
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}>IPFS Storage: </span>
                <a href={item.gatewayURL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                  View in Gateway ↗
                </a>
                <span style={{ color: 'var(--border-strong)' }}>|</span>
                <button 
                  type="button"
                  onClick={() => downloadIPFSFile(item.gatewayURL, `${item.hash.substring(0, 10)}.bin`)}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}
                >
                  Download Original File ↓
                </button>
                <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.ipfsURI})</span>
              </div>

              {/* Licensing Terms */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Active Licensing Agreement:
                  </span>
                  {item.isOwner && editingLicenseHash !== item.hash && (
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setEditingLicenseHash(item.hash);
                        setNewLicenseTerms(item.license);
                      }}
                    >
                      ✏️ Update License Terms
                    </button>
                  )}
                </div>

                {editingLicenseHash === item.hash ? (
                  <div style={{ background: 'rgba(8, 12, 19, 0.8)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-emerald)' }}>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={newLicenseTerms}
                      onChange={(e) => setNewLicenseTerms(e.target.value)}
                      placeholder="Enter updated licensing terms..."
                      disabled={isUpdatingLicense}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        onClick={() => handleUpdateLicense(item.hash)}
                        disabled={isUpdatingLicense}
                      >
                        {isUpdatingLicense ? 'Saving on Blockchain...' : 'Save Updated License'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        onClick={() => setEditingLicenseHash(null)}
                        disabled={isUpdatingLicense}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(8, 12, 19, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {item.license}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <button 
                  type="button"
                  onClick={() => downloadIPFSFile(item.gatewayURL, `${item.hash.substring(0, 10)}.bin`)}
                  className="btn btn-primary" 
                  style={{ fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Original File
                </button>

                <a 
                  href={item.gatewayURL} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View Gateway
                </a>

                <Link href={`/verify?hash=${item.hash}`} className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
                  <span>🔍</span> Public Audit Page
                </Link>

                {item.isOwner && (
                  <>
                    <Link href={`/register?parent=${item.hash}`} className="btn btn-outline" style={{ fontSize: '0.825rem', color: 'var(--accent-teal)', borderColor: 'var(--accent-teal)' }}>
                      <span>↻</span> Publish Revision (v{item.version + 1})
                    </Link>
                    <Link href={`/transfer?hash=${item.hash}`} className="btn btn-outline" style={{ fontSize: '0.825rem', color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>
                      <span>⇄</span> Transfer Title
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
