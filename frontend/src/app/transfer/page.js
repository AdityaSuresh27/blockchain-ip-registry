'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import contractAddress from '../../contracts/contract-address.json';
import IPRegistryArtifact from '../../contracts/IPRegistry.json';

function TransferOwnershipContent() {
  const searchParams = useSearchParams();
  const initialHash = searchParams.get('hash') || '';

  const { account, signer, provider, connectWallet, accounts, currentAccount, connectAccountByIndex } = useWallet();

  const [fileHash, setFileHash] = useState(initialHash);
  const [newOwner, setNewOwner] = useState('');
  const [myRecords, setMyRecords] = useState([]);
  const [selectedRecordDetails, setSelectedRecordDetails] = useState(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(null);

  // Fetch registered records for current account
  useEffect(() => {
    async function loadMyRecords() {
      if (!account || !provider) return;
      try {
        setIsLoadingRecords(true);
        const contract = new ethers.Contract(
          contractAddress.IPRegistry,
          IPRegistryArtifact.abi,
          provider
        );

        // Fetch all hashes to find any IPs currently owned by this account
        const allHashes = await contract.getAllHashes();
        const records = [];

        for (const h of allHashes) {
          const rec = await contract.verifyIP(h);
          if (rec.exists && rec.owner.toLowerCase() === account.toLowerCase()) {
            records.push({
              hash: h,
              version: Number(rec.version),
              timestamp: new Date(Number(rec.timestamp) * 1000).toLocaleDateString(),
              license: rec.licenseTerms
            });
          }
        }
        setMyRecords(records);
      } catch (err) {
        console.warn('Error loading records for transfer:', err);
      } finally {
        setIsLoadingRecords(false);
      }
    }

    loadMyRecords();
  }, [account, provider]);

  // Inspect entered hash
  const handleHashChange = async (val) => {
    setFileHash(val);
    setSelectedRecordDetails(null);
    setTransferSuccess(null);

    if (val && val.startsWith('0x') && val.length === 66 && provider) {
      try {
        const contract = new ethers.Contract(
          contractAddress.IPRegistry,
          IPRegistryArtifact.abi,
          provider
        );
        const rec = await contract.verifyIP(val);
        if (rec.exists) {
          setSelectedRecordDetails({
            exists: true,
            creator: rec.creator,
            owner: rec.owner,
            version: Number(rec.version),
            isOwner: rec.owner.toLowerCase() === (account || '').toLowerCase()
          });
        } else {
          setSelectedRecordDetails({ exists: false });
        }
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!account || !signer) return alert('Please connect your wallet first.');
    if (!fileHash.trim()) return alert('Please enter or select a valid IP file hash.');
    if (!newOwner.trim() || !ethers.isAddress(newOwner.trim())) {
      return alert('Please enter a valid EVM recipient address (0x...).');
    }
    if (newOwner.toLowerCase() === account.toLowerCase()) {
      return alert('Recipient address cannot be your own address.');
    }

    try {
      setIsTransferring(true);
      setStatusMessage('Prompting MetaMask for ownership transfer authorization...');

      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        signer
      );

      const tx = await contract.transferOwnership(fileHash.trim(), newOwner.trim());
      setStatusMessage(`Transaction submitted: ${tx.hash.substring(0, 16)}... Mining block...`);

      const receipt = await tx.wait();
      setStatusMessage('Ownership successfully transferred on-chain!');

      setTransferSuccess({
        hash: fileHash.trim(),
        previousOwner: account,
        newOwner: newOwner.trim(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      // Clear inputs
      setFileHash('');
      setNewOwner('');
      setSelectedRecordDetails(null);
    } catch (err) {
      console.error('Transfer failed:', err);
      setStatusMessage(`Transfer failed: ${err.reason || err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Transfer Intellectual Property Rights
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Reassign legal title and on-chain ownership to another cryptographic wallet identity.
        </p>
      </div>

      <div className="glass-panel">
        {!account ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Select an account from the navbar or connect a wallet to view and manage intellectual property records you own.
            </p>
            <button className="btn-primary" onClick={connectWallet}>
              Connect Default Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleTransfer}>
            {/* Quick selector of owned assets */}
            {myRecords.length > 0 && (
              <div className="form-group">
                <label className="form-label">Select from Your Registered Assets</label>
                <select 
                  className="form-select"
                  onChange={(e) => handleHashChange(e.target.value)}
                  value={fileHash}
                  disabled={isTransferring}
                >
                  <option value="">-- Choose an asset you currently own --</option>
                  {myRecords.map((r, i) => (
                    <option key={i} value={r.hash} style={{ background: '#0d131d', color: '#fff' }}>
                      v{r.version} • {r.hash.substring(0, 16)}... • Registered {r.timestamp}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Asset hash input */}
            <div className="form-group">
              <label className="form-label">Asset SHA-256 Digest (0x...)</label>
              <input
                type="text"
                className="form-input"
                placeholder="0x..."
                value={fileHash}
                onChange={(e) => handleHashChange(e.target.value)}
                disabled={isTransferring}
                required
              />
            </div>

            {/* Ownership validation badge */}
            {selectedRecordDetails && (
              <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: selectedRecordDetails.isOwner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${selectedRecordDetails.isOwner ? 'var(--primary-emerald)' : 'var(--danger)'}` }}>
                {selectedRecordDetails.isOwner ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary-emerald)', fontWeight: 600 }}>
                    ✓ Confirmed: You are the verified on-chain owner of this IP record.
                  </div>
                ) : selectedRecordDetails.exists ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                    ✗ Unauthorized: You are NOT the current owner of this record. Current owner: {selectedRecordDetails.owner}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
                    ✗ Record not found on blockchain.
                  </div>
                )}
              </div>
            )}

            {/* Recipient Address */}
            <div className="form-group">
              <label className="form-label">Recipient Wallet Address (0x...)</label>
              <input
                type="text"
                className="form-input"
                placeholder="0x... (New Owner's Ethereum address)"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                disabled={isTransferring}
                required
              />
              <div style={{ marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Quick fill recipient from simulated identities:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {(accounts || [])
                    .filter(a => a.address.toLowerCase() !== account?.toLowerCase())
                    .map((a, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewOwner(a.address)}
                        className="btn-secondary"
                        style={{ padding: '0.22rem 0.6rem', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        title={a.address}
                      >
                        {a.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {statusMessage && (
              <div style={{ margin: '1.5rem 0', padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--primary-emerald)', textAlign: 'center', fontSize: '0.85rem' }}>
                <span className="status-dot"></span> {statusMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', marginTop: '1rem' }}
              disabled={isTransferring || (selectedRecordDetails && !selectedRecordDetails.isOwner) || (myRecords.length === 0 && !fileHash)}
            >
              {isTransferring ? 'Transferring Ownership...' : 'Execute Ownership Transfer on Blockchain'}
            </button>
          </form>
        )}

        {/* Transfer Confirmation Summary */}
        {transferSuccess && (
          <div style={{ marginTop: '2.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--primary-emerald)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
            <span className="badge badge-success" style={{ marginBottom: '1rem' }}>
              ✓ OWNERSHIP TRANSFER CONFIRMED
            </span>
            <table className="data-table">
              <tbody>
                <tr>
                  <td><strong>Transferred Asset Hash:</strong></td>
                  <td><span className="hash-pill">{transferSuccess.hash}</span></td>
                </tr>
                <tr>
                  <td><strong>Previous Owner:</strong></td>
                  <td><span className="hash-pill">{transferSuccess.previousOwner}</span></td>
                </tr>
                <tr>
                  <td><strong>New Legal Owner:</strong></td>
                  <td><span className="hash-pill">{transferSuccess.newOwner}</span></td>
                </tr>
                <tr>
                  <td><strong>Transaction Hash:</strong></td>
                  <td><span className="hash-pill">{transferSuccess.txHash}</span></td>
                </tr>
                <tr>
                  <td><strong>Confirmed in Block:</strong></td>
                  <td>#{transferSuccess.blockNumber}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '1.25rem' }}>
              <Link href={`/verify?hash=${transferSuccess.hash}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Verify Updated Ownership on Public Page →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransferOwnershipPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>Loading ownership transfer portal...</div>}>
      <TransferOwnershipContent />
    </Suspense>
  );
}
