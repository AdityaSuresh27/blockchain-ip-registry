'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import FileDropZone from '../../components/FileDropZone';
import contractAddress from '../../contracts/contract-address.json';
import IPRegistryArtifact from '../../contracts/IPRegistry.json';

function VerifyIPContent() {
  const searchParams = useSearchParams();
  const initialHash = searchParams.get('hash') || '';

  const { provider, readOnlyProvider, currentAccount } = useWallet();

  const [activeTab, setActiveTab] = useState(initialHash ? 'hash' : 'file');
  const [file, setFile] = useState(null);
  const [computedFileHash, setComputedFileHash] = useState('');
  const [manualHash, setManualHash] = useState(initialHash);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [subsequentVersions, setSubsequentVersions] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute file SHA-256 hash
  const computeFileHash = async (fileToHash) => {
    const arrayBuffer = await fileToHash.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    if (!selectedFile) {
      setComputedFileHash('');
      return;
    }

    try {
      const hash = await computeFileHash(selectedFile);
      setComputedFileHash(hash);
      performVerification(hash);
    } catch (err) {
      console.error('File hashing error:', err);
    }
  };

  const performVerification = async (targetHash) => {
    if (!targetHash || !targetHash.startsWith('0x') || targetHash.length !== 66) {
      alert('Please provide a valid 32-byte hex hash (0x followed by 64 hexadecimal characters).');
      return;
    }

    setIsVerifying(true);
    setResult(null);
    setSubsequentVersions([]);

    try {
      const activeProvider = provider || readOnlyProvider || new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        activeProvider
      );

      const record = await contract.verifyIP(targetHash);

      if (record.exists) {
        // Query subsequent versions if any
        let childVersions = [];
        try {
          childVersions = await contract.getSubsequentVersions(targetHash);
        } catch (e) {
          console.warn('Could not fetch child versions:', e);
        }

        // Query full on-chain transaction history & event logs
        let timelineEvents = [];
        try {
          const regFilter = contract.filters.IPRegistered(targetHash);
          const transferFilter = contract.filters.OwnershipTransferred(targetHash);
          const licenseFilter = contract.filters.LicenseUpdated(targetHash);

          const [regLogs, transferLogs, licenseLogs] = await Promise.all([
            contract.queryFilter(regFilter, 0),
            contract.queryFilter(transferFilter, 0),
            contract.queryFilter(licenseFilter, 0)
          ]);

          for (const log of regLogs) {
            let blkTimestamp = Number(record.timestamp);
            try {
              const blk = await activeProvider.getBlock(log.blockNumber);
              if (blk) blkTimestamp = Number(blk.timestamp);
            } catch (e) {}

            timelineEvents.push({
              type: 'REGISTERED',
              label: 'Original IP Registration',
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: new Date(blkTimestamp * 1000).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'medium'
              }),
              details: `Initial cryptographic fingerprint anchored on-chain by author ${log.args ? (log.args[1] || log.args.creator) : record.creator}`
            });
          }

          for (const log of transferLogs) {
            let blkTimestamp = Number(record.timestamp);
            try {
              const blk = await activeProvider.getBlock(log.blockNumber);
              if (blk) blkTimestamp = Number(blk.timestamp);
            } catch (e) {}

            timelineEvents.push({
              type: 'TRANSFERRED',
              label: 'Ownership Rights Transferred',
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: new Date(blkTimestamp * 1000).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'medium'
              }),
              details: `Legal title transferred from ${log.args ? (log.args[1] || log.args.oldOwner) : 'previous owner'} ➔ ${log.args ? (log.args[2] || log.args.newOwner) : 'new owner'}`
            });
          }

          for (const log of licenseLogs) {
            let blkTimestamp = Number(record.timestamp);
            try {
              const blk = await activeProvider.getBlock(log.blockNumber);
              if (blk) blkTimestamp = Number(blk.timestamp);
            } catch (e) {}

            timelineEvents.push({
              type: 'LICENSED',
              label: 'Licensing Terms Updated',
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: new Date(blkTimestamp * 1000).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'medium'
              }),
              details: `Updated license terms: ${log.args ? (log.args[1] || log.args.newLicenseTerms) : 'terms updated'}`
            });
          }

          timelineEvents.sort((a, b) => a.blockNumber - b.blockNumber);
        } catch (e) {
          console.warn('Could not query on-chain timeline events:', e);
        }

        setResult({
          exists: true,
          hash: targetHash,
          creator: record.creator,
          owner: record.owner,
          timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'medium'
          }),
          rawTimestamp: Number(record.timestamp),
          version: Number(record.version),
          licenseTerms: record.licenseTerms,
          ipfsURI: record.ipfsURI,
          previousVersionHash: record.previousVersionHash !== ethers.ZeroHash ? record.previousVersionHash : null,
          gatewayURL: record.ipfsURI.replace('ipfs://', '/ipfs/'),
          timeline: timelineEvents
        });
        setSubsequentVersions(childVersions);
      } else {
        setResult({
          exists: false,
          hash: targetHash
        });
      }
    } catch (err) {
      console.error('Verification failed:', err);
      alert('Verification query failed. Ensure local Hardhat node is running.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify if initial hash in query params
  useEffect(() => {
    if (initialHash) {
      performVerification(initialHash);
    }
  }, [initialHash]);

  const copyShareLink = () => {
    if (!result?.hash) return;
    const url = `${window.location.origin}/verify?hash=${result.hash}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="container" style={{ maxWidth: '840px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-info">Open Public Verification</span>
          <span className="badge badge-success">No Wallet Login Required</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Verify Asset Authenticity & Provenance
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto' }}>
          Independently audit any file or cryptographic hash against the immutable EVM ledger.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
        <button
          className={`btn ${activeTab === 'file' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('file')}
        >
          <span>📁</span> Verify by File Upload
        </button>
        <button
          className={`btn ${activeTab === 'hash' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('hash')}
        >
          <span>#️⃣</span> Verify by Cryptographic Hash
        </button>
      </div>

      <div className="glass-panel">
        {activeTab === 'file' ? (
          <div>
            <label className="form-label">Upload File to Re-Hash & Check</label>
            <FileDropZone
              onFileSelected={handleFileSelected}
              selectedFile={file}
              computedHash={computedFileHash}
              disabled={isVerifying}
            />
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); performVerification(manualHash.trim()); }}>
            <label className="form-label">Enter SHA-256 Digest (32-Byte Hex)</label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={isVerifying || !manualHash}
            >
              {isVerifying ? 'Querying Blockchain...' : 'Audit on Blockchain'}
            </button>
          </form>
        )}

        {isVerifying && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <span className="status-dot"></span>
            <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>
              Querying EVM Smart Contract state...
            </span>
          </div>
        )}

        {/* Verification Results */}
        {result && (
          <div style={{ marginTop: '2.5rem' }}>
            {result.exists ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--primary-emerald)', borderRadius: 'var(--radius-md)', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                      ✓ VERIFIED AUTHENTIC & UNTAMPERED
                    </span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.75rem', marginBottom: 0 }}>
                      Cryptographic Match Found
                    </h2>
                  </div>

                  <button className="btn btn-secondary" onClick={copyShareLink} style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                    {copiedLink ? '✓ Copied Link' : '🔗 Copy Shareable Audit Link'}
                  </button>
                </div>

                <table className="data-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '220px' }}><strong>SHA-256 Fingerprint:</strong></td>
                      <td><span className="hash-pill">{result.hash}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Proof of Creation Time:</strong></td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary-emerald)' }}>{result.timestamp}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(Unix: {result.rawTimestamp})</span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Original Creator:</strong></td>
                      <td>
                        <span className="hash-pill">{result.creator}</span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Current Titleholder (Owner):</strong></td>
                      <td>
                        <span className="hash-pill">{result.owner}</span>
                        {result.creator.toLowerCase() !== result.owner.toLowerCase() && (
                          <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>Transferred</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Version Lineage:</strong></td>
                      <td>
                        <span className="badge badge-info">Version {result.version}.0</span>
                        {result.previousVersionHash && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Predecessor Version: </span>
                            <span 
                              className="hash-pill clickable"
                              onClick={() => performVerification(result.previousVersionHash)}
                              title="Click to verify parent version"
                            >
                              {result.previousVersionHash.substring(0, 16)}... ↗
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Off-Chain IPFS Storage:</strong></td>
                      <td>
                        <a 
                          href={result.gatewayURL} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {result.ipfsURI} ↗ (View / Download from Local IPFS Gateway)
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Digital Licensing Terms:</strong></td>
                      <td>
                        <div style={{ background: 'rgba(8, 12, 19, 0.7)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                          {result.licenseTerms}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Subsequent child versions if any */}
                {subsequentVersions.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Linked Subsequent Versions ({subsequentVersions.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {subsequentVersions.map((childHash, idx) => (
                        <button
                          key={idx}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                          onClick={() => performVerification(childHash)}
                        >
                          Version {result.version + idx + 1}: {childHash.substring(0, 12)}... ↗
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📜</span> Complete On-Chain Transaction Audit Trail
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                        Full chronological provenance and ownership history mined into the blockchain ledger
                      </p>
                    </div>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                      {result.timeline?.length || 1} Confirmed Lifecycle Event{result.timeline?.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {result.timeline && result.timeline.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {result.timeline.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1rem 1.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: item.type === 'REGISTERED' ? '#10b981' : item.type === 'TRANSFERRED' ? '#3b82f6' : '#a855f7'
                              }} />
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.label}</strong>
                              <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)' }}>
                                Block #{item.blockNumber}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {item.timestamp}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.35rem 0' }}>
                            {item.details}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>Tx Hash:</span>
                            <span className="hash-pill font-mono">{item.txHash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      First registration mined and sealed on-chain.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center' }}>
                <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', marginBottom: '1rem' }}>
                  ✗ UNREGISTERED OR ALTERED ASSET
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0.5rem 0' }}>
                  No Authentic On-Chain Record Found
                </h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
                  This cryptographic fingerprint does not exist in the IP registry. If this file was modified even by a single byte, its SHA-256 digest changes completely.
                </p>
                <div className="hash-pill" style={{ margin: '0 auto' }}>
                  {result.hash}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyIPPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>Loading verification portal...</div>}>
      <VerifyIPContent />
    </Suspense>
  );
}
