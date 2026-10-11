'use client';

import React from 'react';

export default function TransactionStepper({ currentStep, steps, statusMessage, txHash }) {
  const defaultSteps = [
    { title: 'Asset Upload', desc: 'Select file' },
    { title: 'SHA-256 Digest', desc: 'Crypto fingerprint' },
    { title: 'IPFS Pinning', desc: 'Off-chain storage' },
    { title: 'Smart Contract', desc: 'Sign transaction' },
    { title: 'Immutable Proof', desc: 'Mined on EVM' },
  ];

  const activeSteps = steps || defaultSteps;

  return (
    <div style={{ margin: '2rem 0' }}>
      <div className="stepper">
        {activeSteps.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isActive = currentStep === stepNum;

          return (
            <div 
              key={idx} 
              className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-bubble">
                {isDone ? '✓' : stepNum}
              </div>
              <div className="step-label">{step.title}</div>
            </div>
          );
        })}
      </div>

      {statusMessage && (
        <div 
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--primary-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginTop: '1.25rem'
          }}
        >
          <span className="status-dot"></span>
          <span>{statusMessage}</span>
        </div>
      )}

      {txHash && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Transaction: </span>
          <span className="hash-pill">{txHash}</span>
        </div>
      )}
    </div>
  );
}
