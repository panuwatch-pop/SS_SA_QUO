/**
 * Utility to save a PDF Blob to the user's disk.
 * Supports File System Access API (showSaveFilePicker) allowing the user to select any folder.
 * Falls back to browser download if the API is unsupported.
 */
export async function savePdfBlob(blob: Blob, suggestedName: string): Promise<void> {
  // 1. Check for File System Access API (supported in Edge, Chrome, Opera)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: suggestedName,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: {
              'application/pdf': ['.pdf']
            }
          }
        ]
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the file picker dialog
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // 2. Fallback for browsers without File System Access API (Firefox, Safari, mobile)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
