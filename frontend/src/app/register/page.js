'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import FileDropZone from '../../components/FileDropZone';
import TransactionStepper from '../../components/TransactionStepper';
import contractAddress from '../../contracts/contract-address.json';
import IPRegistryArtifact from '../../contracts/IPRegistry.json';

const LICENSE_PRESETS = [
  { label: 'MIT License (Open Source Software)', value: 'MIT License - Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...' },
  { label: 'Apache 2.0 License (Commercial & Patent Safe)', value: 'Apache License 2.0 - Subject to the terms and conditions, each contributor grants a perpetual, worldwide, non-exclusive license...' },
  { label: 'Creative Commons CC-BY 4.0 (Attribution)', value: 'Creative Commons Attribution 4.0 International (CC BY 4.0) - You are free to share and adapt the material for any purpose with attribution.' },
  { label: 'Creative Commons CC-BY-NC 4.0 (Non-Commercial)', value: 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) - Non-commercial sharing and adaptation with attribution.' },
  { label: 'All Rights Reserved (Proprietary)', value: 'All Rights Reserved. No reproduction, distribution, or derivative works without explicit written authorization of the copyright holder.' },
  { label: 'Custom License Terms', value: '' }
];

function RegisterIPContent() {
  const searchParams = useSearchParams();
  const initialParent = searchParams.get('parent') || searchParams.get('revisionOf') || '';

  const { account, signer, provider, readOnlyProvider, connectWallet, currentAccount, connectAccountByIndex } = useWallet();

  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [licensePreset, setLicensePreset] = useState(LICENSE_PRESETS[0].label);
  const [licenseTerms, setLicenseTerms] = useState(LICENSE_PRESETS[0].value);
  const [isRevision, setIsRevision] = useState(Boolean(initialParent));
  const [parentHash, setParentHash] = useState(initialParent);

  // Predecessor verification state
  const [parentRecord, setParentRecord] = useState(null);
  const [isCheckingParent, setIsCheckingParent] = useState(false);
  const [parentError, setParentError] = useState('');

  const checkPredecessor = React.useCallback(async (hash) => {
    if (!hash || !hash.startsWith('0x') || hash.length !== 66) {
      setParentRecord(null);
      if (hash && hash.length > 2) {
        setParentError('Predecessor hash must be a valid 66-character hex string (0x...)');
      } else {
        setParentError('');
      }
      return;
    }

    const activeProvider = provider || readOnlyProvider;
    if (!activeProvider) return;

    try {
      setIsCheckingParent(true);
      setParentError('');
      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        activeProvider
      );

      const rec = await contract.verifyIP(hash);
      if (!rec.exists) {
        setParentRecord(null);
        setParentError('Predecessor IP not found in blockchain registry.');
      } else {
        const isOwner = (account || '').toLowerCase() === rec.owner.toLowerCase();
        setParentRecord({
          exists: true,
          creator: rec.creator,
          owner: rec.owner,
          version: Number(rec.version),
          timestamp: new Date(Number(rec.timestamp) * 1000).toLocaleString(),
          licenseTerms: rec.licenseTerms,
          ipfsURI: rec.ipfsURI,
          isOwner
        });

        if (!isOwner) {
          setParentError(`Permission Denied: Only current legal titleholder (${rec.owner.slice(0, 8)}...) can publish revisions to this IP.`);
        }
      }
    } catch (e) {
      console.warn('Error checking predecessor:', e);
      setParentError('Error verifying predecessor hash on blockchain.');
    } finally {
      setIsCheckingParent(false);
    }
  }, [account, provider, readOnlyProvider]);

  useEffect(() => {
    if (initialParent) {
      setIsRevision(true);
      setParentHash(initialParent);
    }
  }, [initialParent]);

  useEffect(() => {
    if (isRevision && parentHash) {
      checkPredecessor(parentHash.trim());
    } else {
      setParentRecord(null);
      setParentError('');
    }
  }, [isRevision, parentHash, account, checkPredecessor]);
  
  // Pipeline status
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // Duplicate check state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // Completion summary
  const [registeredRecord, setRegisteredRecord] = useState(null);

  // Compute file SHA-256 hash using browser Web Crypto API
  const computeFileHash = async (fileToHash) => {
    const arrayBuffer = await fileToHash.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setIsDuplicate(false);
    setDuplicateInfo(null);
    setRegisteredRecord(null);
    setTxHash('');
    setCurrentStep(1);

    if (!selectedFile) {
      setFileHash('');
      return;
    }

    try {
      setCurrentStep(2);
      setStatusMessage('Calculating SHA-256 cryptographic digest...');
      const hash = await computeFileHash(selectedFile);
      setFileHash(hash);

      // Pre-flight duplicate check against smart contract
      await checkDuplicate(hash);
    } catch (err) {
      console.error('Hash calculation error:', err);
      setStatusMessage('Error calculating file hash.');
    }
  };

  const checkDuplicate = async (hash) => {
    const activeProvider = provider || readOnlyProvider;
    if (!activeProvider) return;

    try {
      setIsCheckingDuplicate(true);
      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        activeProvider
      );

      const result = await contract.verifyIP(hash);
      if (result.exists) {
        setIsDuplicate(true);
        setDuplicateInfo({
          creator: result.creator,
          owner: result.owner,
          timestamp: new Date(Number(result.timestamp) * 1000).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'medium'
          }),
          version: Number(result.version),
          ipfsURI: result.ipfsURI,
          licenseTerms: result.licenseTerms
        });
        setStatusMessage('🛡️ DUPLICATE CLAIM DETECTED: This file content is already registered and protected on-chain.');
      } else {
        setIsDuplicate(false);
        setDuplicateInfo(null);
        setStatusMessage('Hash verified unique. Ready for off-chain IPFS pinning.');
      }
    } catch (e) {
      console.warn('Duplicate check warning:', e);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handlePresetChange = (e) => {
    const label = e.target.value;
    setLicensePreset(label);
    const found = LICENSE_PRESETS.find(p => p.label === label);
    if (found && found.value !== '') {
      setLicenseTerms(found.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) return alert('Please select a file to register.');
    if (!account || !signer) return alert('Please select an active account identity in the top navbar or connect a wallet.');
    if (isDuplicate) return alert('Cannot register: this file content is already registered and protected on the blockchain.');
    if (!licenseTerms.trim()) return alert('Please specify license terms.');

    if (isRevision) {
      if (!parentHash.trim()) return alert('Please provide the predecessor version hash.');
      if (!parentRecord || !parentRecord.exists) {
        return alert('Cannot publish revision: Predecessor IP was not found on the blockchain.');
      }
      if (!parentRecord.isOwner) {
        return alert(`Cannot publish revision: Only the current verified legal owner (${parentRecord.owner}) can publish revisions to this IP. Your active wallet is ${account}.`);
      }
    }

    try {
      setIsProcessing(true);

      // Step 3: Pin to Local IPFS node via Next.js API route
      setCurrentStep(3);
      setStatusMessage('Uploading to local IPFS node & generating CIDv0...');
      
      const formData = new FormData();
      formData.append('file', file);

      const ipfsRes = await fetch('/api/ipfs', {
        method: 'POST',
        body: formData
      });

      if (!ipfsRes.ok) {
        throw new Error('Failed to pin file to local IPFS daemon.');
      }

      const ipfsData = await ipfsRes.json();
      const ipfsURI = ipfsData.ipfsURI;

      // Step 4: Submit transaction to EVM smart contract
      setCurrentStep(4);
      setStatusMessage('Please confirm transaction in MetaMask...');

      const contract = new ethers.Contract(
        contractAddress.IPRegistry,
        IPRegistryArtifact.abi,
        signer
      );

      let tx;
      if (isRevision) {
        // Register version revision
        tx = await contract.registerNewVersion(
          parentHash.trim(),
          fileHash,
          licenseTerms,
          ipfsURI
        );
      } else {
        // Register initial asset
        tx = await contract.registerIP(
          fileHash,
          licenseTerms,
          ipfsURI,
          1
        );
      }

      setTxHash(tx.hash);
      setStatusMessage('Transaction submitted. Mining on EVM block...');

      // Step 5: Wait for receipt
      const receipt = await tx.wait();
      setCurrentStep(5);
      setStatusMessage('Confirmed! Asset registered immutably on blockchain.');

      setRegisteredRecord({
        fileHash,
        fileName: file.name,
        fileSize: file.size,
        ipfsURI,
        gatewayURL: ipfsData.gatewayURL,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toLocaleString(),
        license: licenseTerms,
        version: isRevision ? `Revision (v${(parentRecord?.version || 1) + 1}.0)` : 'Version 1.0',
        creator: account
      });
    } catch (err) {
      console.error('Registration failed:', err);
      setStatusMessage(`Transaction failed: ${err.reason || err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '840px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Register Digital Intellectual Property
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Anchor cryptographic proof of authorship, license terms, and off-chain storage on-chain.
        </p>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleSubmit}>
          {/* File Upload Zone */}
          <div className="form-group">
            <label className="form-label">Digital Creative Work</label>
            <FileDropZone 
              onFileSelected={handleFileSelected} 
              selectedFile={file} 
              computedHash={fileHash}
              disabled={isProcessing}
            />
          </div>

          {/* Blockchain Duplicate Claim Collision Alert */}
          {isDuplicate && duplicateInfo && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.45)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🛡️</span> BLOCKCHAIN IP PROTECTION TRIGGERED: DUPLICATE BLOCKED
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                The cryptographic SHA-256 fingerprint of this file matches an intellectual property asset already anchored in the immutable smart contract ledger. 
                The protocol prevents unauthorized duplicate registration to safeguard original authorship.
              </p>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.35)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'grid', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div><strong>Original Author / Creator:</strong> <span className="hash-pill">{duplicateInfo.creator}</span></div>
                <div><strong>Current Titleholder (Owner):</strong> <span className="hash-pill">{duplicateInfo.owner || duplicateInfo.creator}</span></div>
                <div><strong>First Registered On-Chain:</strong> <span style={{ color: '#6ee7b7', fontWeight: 600 }}>{duplicateInfo.timestamp}</span></div>
                <div><strong>Version Number:</strong> v{duplicateInfo.version}.0</div>
                {duplicateInfo.licenseTerms && (
                  <div><strong>Protected Under License:</strong> <span style={{ color: '#93c5fd' }}>{duplicateInfo.licenseTerms.substring(0, 60)}...</span></div>
                )}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/verify?hash=${fileHash}`} className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}>
                  🔍 Inspect Original Provenance on Public Verify Page →
                </Link>
              </div>
            </div>
          )}

          {/* Versioning Options */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Version Lineage</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isRevision} 
                  onChange={(e) => setIsRevision(e.target.checked)}
                  disabled={isProcessing}
                  style={{ accentColor: 'var(--primary-emerald)' }}
                />
                This is a revision / update to an existing registered IP
              </label>
            </div>

            {isRevision && (
              <div style={{ background: 'rgba(8, 12, 19, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>
                    Predecessor Version File Hash (0x...)
                  </label>
                  {isCheckingParent && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      Verifying title on smart contract...
                    </span>
                  )}
                </div>

                <input 
                  type="text"
                  className="form-input"
                  placeholder="0x... (Hash of previous version)"
                  value={parentHash}
                  onChange={(e) => setParentHash(e.target.value)}
                  disabled={isProcessing}
                  required={isRevision}
                />

                {parentRecord && parentRecord.exists && (
                  parentRecord.isOwner ? (
                    <div style={{ marginTop: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                      <div style={{ color: 'var(--primary-emerald)', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span>✅</span> Predecessor Ownership Verified: Authorized to Publish Revision
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'grid', gap: '0.25rem' }}>
                        <div><strong>Active Version:</strong> Version {parentRecord.version}.0 → Next Revision: <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>Version {parentRecord.version + 1}.0</span></div>
                        <div><strong>Verified Titleholder (You):</strong> <span className="mono">{parentRecord.owner}</span></div>
                        <div><strong>Original Author:</strong> <span className="mono">{parentRecord.creator}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.45)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem' }}>
                      <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span>⛔</span> ACCESS DENIED: Only Verified Titleholder Can Revise This IP
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'grid', gap: '0.35rem', lineHeight: 1.4 }}>
                        <div>Under Ethereum smart contract rules, only the account holding legal title can publish new revisions or update content.</div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                          <div><strong>Verified Titleholder:</strong> <span className="mono" style={{ color: '#fbbf24' }}>{parentRecord.owner}</span></div>
                          <div><strong>Your Active Wallet:</strong> <span className="mono" style={{ color: '#f87171' }}>{account || 'None'}</span></div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Switch to the titleholder account in the top navbar switcher to publish an update to this IP.
                        </div>
                      </div>
                    </div>
                  )
                )}

                {parentError && (!parentRecord || !parentRecord.exists) && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#f87171' }}>
                    {parentError}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>
                  The smart contract will link this new revision directly into the immutable parent-child version chain.
                </p>
              </div>
            )}
          </div>

          {/* Licensing Configuration */}
          <div className="form-group">
            <label className="form-label">Digital License Agreement</label>
            <select 
              className="form-select" 
              value={licensePreset} 
              onChange={handlePresetChange}
              disabled={isProcessing}
              style={{ marginBottom: '0.75rem' }}
            >
              {LICENSE_PRESETS.map((p, i) => (
                <option key={i} value={p.label} style={{ background: '#0d131d', color: '#fff' }}>
                  {p.label}
                </option>
              ))}
            </select>

            <textarea 
              className="form-textarea" 
              rows={4}
              placeholder="Enter license agreement text or machine-readable terms..."
              value={licenseTerms}
              onChange={(e) => setLicenseTerms(e.target.value)}
              disabled={isProcessing}
              required
            />
          </div>

          {/* Stepper Pipeline Visualizer */}
          <TransactionStepper 
            currentStep={currentStep} 
            statusMessage={statusMessage} 
            txHash={txHash}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            {account ? (
              isDuplicate ? (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', opacity: 0.85, cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', fontWeight: 700 }}
                  disabled
                >
                  🛡️ Registration Blocked: Content Already Protected on Blockchain
                </button>
              ) : isRevision && parentRecord && !parentRecord.isOwner ? (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', opacity: 0.85, cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', fontWeight: 700 }}
                  disabled
                >
                  ⛔ Revision Blocked: Only Titleholder ({parentRecord.owner.substring(0, 8)}...) Can Publish Updates
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem' }}
                  disabled={isProcessing || !file || isCheckingDuplicate || (isRevision && (!parentRecord || !parentRecord.isOwner))}
                >
                  {isProcessing ? 'Processing Registration...' : isRevision ? `Publish Revision (v${(parentRecord?.version || 1) + 1}.0)` : 'Register on Blockchain (EVM)'}
                </button>
              )
            ) : (
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '1rem' }}
                onClick={connectWallet}
              >
                Connect Wallet to Register
              </button>
            )}
          </div>
        </form>

        {/* Success Card */}
        {registeredRecord && (
          <div style={{ marginTop: '2.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--primary-emerald)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge badge-success">✓ REGISTRATION CONFIRMED</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{registeredRecord.fileName}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a 
                  href={`${registeredRecord.gatewayURL}?download=1`} 
                  download 
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Original File
                </a>
                <Link href={`/verify?hash=${registeredRecord.fileHash}`} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  Verify On-Chain →
                </Link>
              </div>
            </div>

            <table className="data-table">
              <tbody>
                <tr>
                  <td><strong>SHA-256 Digest:</strong></td>
                  <td><span className="hash-pill">{registeredRecord.fileHash}</span></td>
                </tr>
                <tr>
                  <td><strong>IPFS URI (Off-Chain):</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <a href={registeredRecord.gatewayURL} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                        View in Gateway ↗
                      </a>
                      <span style={{ color: 'var(--border-strong)' }}>|</span>
                      <a href={`${registeredRecord.gatewayURL}?download=1`} download style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600 }}>
                        Download Original File ↓
                      </a>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({registeredRecord.ipfsURI})</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>Transaction Hash:</strong></td>
                  <td><span className="hash-pill">{registeredRecord.txHash}</span></td>
                </tr>
                <tr>
                  <td><strong>Block Number:</strong></td>
                  <td>#{registeredRecord.blockNumber}</td>
                </tr>
                <tr>
                  <td><strong>Timestamp:</strong></td>
                  <td>{registeredRecord.timestamp}</td>
                </tr>
                <tr>
                  <td><strong>Owner & Creator:</strong></td>
                  <td>{registeredRecord.creator}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterIPPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>Loading IP registration portal...</div>}>
      <RegisterIPContent />
    </Suspense>
  );
}
