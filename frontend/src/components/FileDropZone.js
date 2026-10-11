'use client';

import React, { useState, useRef } from 'react';

export default function FileDropZone({ onFileSelected, selectedFile, computedHash, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    onFileSelected(file);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <div
        className={`dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="dropzone-icon">
          {selectedFile ? '📄' : '📁'}
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
          {selectedFile ? selectedFile.name : 'Choose a file or drag & drop it here'}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 0 }}>
          {selectedFile 
            ? `${formatBytes(selectedFile.size)} • ${selectedFile.type || 'Binary / Unspecified'}`
            : 'Any digital creative work: source code, research paper, design, music, image, or document'}
        </p>
      </div>

      {computedHash && (
        <div style={{ marginTop: '1rem', background: 'rgba(8, 12, 19, 0.7)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              SHA-256 Digest (On-Chain Fingerprint):
            </span>
            <span className="badge badge-success">Generated in Browser</span>
          </div>
          <div className="hash-pill" style={{ width: '100%', wordBreak: 'break-all' }}>
            {computedHash}
          </div>
        </div>
      )}
    </div>
  );
}
