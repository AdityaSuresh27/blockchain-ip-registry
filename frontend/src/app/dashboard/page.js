'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import contractAddress from '../../contracts/contract-address.json';
import IPRegistryArtifact from '../../contracts/IPRegistry.json';

export default function DashboardPage() {
  const { account, signer, provider, connectWallet, currentAccount, connectAccountByIndex } = useWallet();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLicenseHash, setEditingLicenseHash] = useState(null);
  const [newLicenseTerms, setNewLicenseTerms] = useState('');
  const [isUpdatingLicense, setIsUpdatingLicense] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const loadPortfolio = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setIsLoading(true);
      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        provider
      );

      const hashes = await contract.getCreatorRecords(account);
      const loaded = [];

      for (const h of hashes) {
        const rec = await contract.verifyIP(h);
        if (rec.exists) {
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
            isOwner: rec.owner.toLowerCase() === account.toLowerCase(),
            isCreator: rec.creator.toLowerCase() === account.toLowerCase()
          });
        }
      }
      setRecords(loaded.reverse());
    } catch (err) {
      console.warn('Error loading portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account, provider]);

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

          {records.map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-success">Version {item.version}.0</span>
                  {item.isCreator && <span className="badge badge-info">Author / Creator</span>}
                  {item.isOwner ? (
                    <span className="badge badge-success">Current Titleholder</span>
                  ) : (
                    <span className="badge badge-warning">Transferred to {item.owner.substring(0, 8)}...</span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Registered on {item.timestamp}
                </div>
              </div>

              {/* SHA-256 Hash */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Cryptographic File Hash (SHA-256):
                </div>
                <div className="hash-pill" style={{ width: '100%', wordBreak: 'break-all' }}>
                  {item.hash}
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
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>IPFS Storage: </span>
                <a href={item.gatewayURL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                  {item.ipfsURI} ↗ (View payload in IPFS Gateway)
                </a>
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
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <Link href={`/verify?hash=${item.hash}`} className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
                  <span>🔍</span> Public Audit Page
                </Link>

                {item.isOwner && (
                  <>
                    <Link href={`/register?parent=${item.hash}`} className="btn btn-outline" style={{ fontSize: '0.825rem' }}>
                      <span>↻</span> Publish Next Revision (v{item.version + 1})
                    </Link>
                    <Link href={`/transfer?hash=${item.hash}`} className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
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
