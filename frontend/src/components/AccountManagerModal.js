'use client';

import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function AccountManagerModal({ isOpen, onClose }) {
  const {
    accounts,
    activeAccountIndex,
    connectAccountByIndex,
    createRandomAccount,
    importAccount,
    removeCustomAccount,
    balance,
    account: activeAddress
  } = useWallet();

  const [tab, setTab] = useState('generate'); // 'generate' | 'import'
  const [genName, setGenName] = useState('');
  const [genRole, setGenRole] = useState('');
  const [importName, setImportName] = useState('');
  const [importKey, setImportKey] = useState('');
  const [importRole, setImportRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg({ text: 'Generating wallet and funding with 10 ETH from Alice...', type: 'info' });

    const res = await createRandomAccount(genName, genRole);
    setIsSubmitting(false);

    if (res.success) {
      setStatusMsg({ text: `Account "${res.account.name}" created and funded! Switched as active.`, type: 'success' });
      setGenName('');
      setGenRole('');
    } else {
      setStatusMsg({ text: `Error: ${res.error}`, type: 'error' });
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importKey.trim()) {
      setStatusMsg({ text: 'Please enter a private key.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ text: 'Validating and importing account...', type: 'info' });

    const res = await importAccount(importName, importKey, importRole);
    setIsSubmitting(false);

    if (res.success) {
      setStatusMsg({ text: `Account "${res.account.name}" imported and connected!`, type: 'success' });
      setImportName('');
      setImportKey('');
      setImportRole('');
    } else {
      setStatusMsg({ text: `Import failed: ${res.error}`, type: 'error' });
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Blockchain Account Manager</h3>
            <p className="modal-subtitle">Switch simulation roles, generate funded test wallets, or import keys</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Status banner */}
        {statusMsg.text && (
          <div className={`modal-alert ${statusMsg.type}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Tab switch */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'generate' ? 'active' : ''}`}
            onClick={() => { setTab('generate'); setStatusMsg({ text: '', type: '' }); }}
          >
            ⚡ Generate Random Account
          </button>
          <button
            className={`modal-tab ${tab === 'import' ? 'active' : ''}`}
            onClick={() => { setTab('import'); setStatusMsg({ text: '', type: '' }); }}
          >
            🔑 Import Private Key
          </button>
        </div>

        {/* Tab Content: Generate */}
        {tab === 'generate' && (
          <form onSubmit={handleGenerate} className="modal-form">
            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
              <label className="form-label">Account Label / Person</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Grace (Tech Transfer Officer)"
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Role / Organization</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. University Licensing Bureau"
                value={genRole}
                onChange={(e) => setGenRole(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isSubmitting ? 'Creating & Auto-funding...' : '✨ Generate & Auto-Fund (10 ETH)'}
            </button>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Automatically transfers 10 test ETH from Alice to pay for smart contract gas fees immediately.
            </p>
          </form>
        )}

        {/* Tab Content: Import */}
        {tab === 'import' && (
          <form onSubmit={handleImport} className="modal-form">
            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
              <label className="form-label">Account Name / Label</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Custom Hardhat Key #7"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
              <label className="form-label">Private Key (64-char Hex)</label>
              <input
                type="password"
                className="form-input font-mono"
                placeholder="0x..."
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. External Patent Assessor"
                value={importRole}
                onChange={(e) => setImportRole(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isSubmitting ? 'Importing...' : '🔑 Import & Connect Account'}
            </button>
          </form>
        )}

        {/* Existing Accounts List */}
        <div className="modal-accounts-section">
          <div className="modal-accounts-title">
            <span>Available Accounts ({accounts.length})</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to switch identity</span>
          </div>

          <div className="modal-accounts-list">
            {accounts.map((acc, idx) => {
              const isActive = idx === activeAccountIndex;
              return (
                <div
                  key={idx}
                  className={`modal-account-card ${isActive ? 'active' : ''}`}
                  onClick={() => connectAccountByIndex(idx)}
                >
                  <div className="modal-account-left">
                    <div className="modal-account-name">
                      <span>{acc.name}</span>
                      {isActive && <span className="modal-active-badge">ACTIVE</span>}
                    </div>
                    <div className="modal-account-sub">
                      <span>{acc.role}</span>
                      <span>·</span>
                      <span className="font-mono">{formatAddress(acc.address)}</span>
                    </div>
                  </div>

                  <div className="modal-account-right">
                    {isActive ? (
                      <span className="modal-account-bal">{parseFloat(balance).toFixed(1)} ETH</span>
                    ) : (
                      <button className="btn-secondary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}>
                        Switch
                      </button>
                    )}

                    {acc.isCustom && (
                      <button
                        className="modal-trash-btn"
                        title="Remove custom account"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove account "${acc.name}"?`)) {
                            removeCustomAccount(acc.address);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
