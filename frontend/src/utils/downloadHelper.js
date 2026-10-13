/**
 * Robust client-side file download utility.
 * Fetches the IPFS payload as a Blob and triggers an immediate local browser save.
 * Guarantees that the browser downloads the file directly without opening a blank tab
 * and preserves the true filename and extension from the Content-Disposition header.
 */
export async function downloadIPFSFile(gatewayURL, fallbackFilename = 'asset.bin') {
  try {
    if (!gatewayURL) return;
    const url = gatewayURL.includes('?download=1') ? gatewayURL : `${gatewayURL}?download=1`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    let filename = fallbackFilename;
    const disposition = res.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch (err) {
    console.warn('Direct blob download fallback:', err);
    // Fallback: standard hidden link trigger
    const link = document.createElement('a');
    link.href = `${gatewayURL}?download=1`;
    link.download = fallbackFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
