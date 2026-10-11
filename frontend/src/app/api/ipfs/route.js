import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Helper to encode a buffer to base58 (standard IPFS CIDv0 format)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(buffer) {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
    str += '1';
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += ALPHABET[digits[i]];
  }
  return str;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compute standard SHA-256 for IPFS multihash prefix (0x12 = sha256, 0x20 = 32 bytes)
    const sha256Digest = crypto.createHash('sha256').update(buffer).digest();
    const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256Digest]);
    const cid = toBase58(multihash);

    // Save to public/ipfs directory for local gateway serving
    const ipfsDir = path.join(process.cwd(), 'public', 'ipfs');
    if (!fs.existsSync(ipfsDir)) {
      fs.mkdirSync(ipfsDir, { recursive: true });
    }

    // Save actual file with CID filename
    const filePath = path.join(ipfsDir, cid);
    fs.writeFileSync(filePath, buffer);

    // Also store metadata record
    const metaPath = path.join(ipfsDir, `${cid}.meta.json`);
    const metadata = {
      cid,
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      sha256Hex: '0x' + sha256Digest.toString('hex'),
      pinnedAt: new Date().toISOString(),
      provider: 'Local IPFS Daemon (Simulated Node)'
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      cid: cid,
      ipfsURI: `ipfs://${cid}`,
      gatewayURL: `/ipfs/${cid}`,
      metadata: metadata
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    return NextResponse.json({ error: 'Failed to pin file to local IPFS node' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');

  if (!cid) {
    return NextResponse.json({ error: 'CID parameter is required' }, { status: 400 });
  }

  const metaPath = path.join(process.cwd(), 'public', 'ipfs', `${cid}.meta.json`);
  if (!fs.existsSync(metaPath)) {
    return NextResponse.json({ error: 'CID not found on local IPFS storage' }, { status: 404 });
  }

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return NextResponse.json({ success: true, metadata });
}
