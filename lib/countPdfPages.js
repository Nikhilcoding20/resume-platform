import pdf from 'pdf-parse/lib/pdf-parse.js'

/** Count pages in a PDF buffer (Chromium/Puppeteer output). */
export async function countPdfPages(buffer) {
  const data = await pdf(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer))
  return data.numpages || 1
}
