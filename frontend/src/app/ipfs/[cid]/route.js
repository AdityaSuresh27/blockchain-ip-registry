import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Known mime types fallback map for common file extensions
const MIME_MAP = {
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.py': 'text/x-python; charset=utf-8',
  '.sol': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export async function GET(request, context) {
  try {
    const { params } = context;
    const cid = (await params)?.cid;

    if (!cid) {
      return NextResponse.json({ error: 'CID parameter is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const wantsDownload = searchParams.get('download') === 'true' || searchParams.get('download') === '1';
    const wantsMetaOnly = searchParams.get('meta') === 'true' || searchParams.get('metadata') === 'true';

    // Check possible storage locations: storage/ipfs first, then fallback to public/ipfs
    const searchDirs = [
      path.join(process.cwd(), 'storage', 'ipfs'),
      path.join(process.cwd(), 'public', 'ipfs')
    ];

    let filePath = null;
    let metaPath = null;

    for (const dir of searchDirs) {
      const candidateFile = path.join(dir, cid);
      const candidateMeta = path.join(dir, `${cid}.meta.json`);

      if (fs.existsSync(candidateFile) && !filePath) {
        filePath = candidateFile;
      }
      if (fs.existsSync(candidateMeta) && !metaPath) {
        metaPath = candidateMeta;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { 
          error: 'CID not found on local IPFS storage daemon',
          cid: cid,
          hint: 'The requested IPFS payload does not exist in local pinned cache.' 
        }, 
        { status: 404 }
      );
    }

    // Load metadata if present
    let metadata = {
      filename: `${cid}.bin`,
      mimeType: 'application/octet-stream',
      sha256Hex: null
    };

    if (metaPath && fs.existsSync(metaPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        metadata = { ...metadata, ...parsed };
      } catch (e) {
        console.warn('Could not parse metadata for CID:', cid, e);
      }
    }

    // If client requested metadata only
    if (wantsMetaOnly) {
      return NextResponse.json({ success: true, cid, metadata });
    }

    // Determine MIME type with extension fallback
    let contentType = metadata.mimeType || 'application/octet-stream';
    if (contentType === 'application/octet-stream' && metadata.filename) {
      const ext = path.extname(metadata.filename).toLowerCase();
      if (MIME_MAP[ext]) {
        contentType = MIME_MAP[ext];
      }
    }

    // If it's a text file and doesn't specify charset, ensure UTF-8
    if (contentType.startsWith('text/') && !contentType.includes('charset=')) {
      contentType = `${contentType}; charset=utf-8`;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const safeFilename = metadata.filename || `${cid}.bin`;
    // Clean filename for header
    const cleanFilename = safeFilename.replace(/[^\w.-]/g, '_');

    const dispositionType = wantsDownload ? 'attachment' : 'inline';
    const contentDisposition = `${dispositionType}; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // IPFS content is content-addressed and immutable
    headers.set('x-ipfs-cid', cid);
    headers.set('x-ipfs-provider', 'Local IPFS Daemon (Simulated Node)');
    if (metadata.sha256Hex) {
      headers.set('x-sha256-hash', metadata.sha256Hex);
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('IPFS Gateway error:', error);
    return NextResponse.json({ error: 'Internal IPFS Gateway Error' }, { status: 500 });
  }
}
