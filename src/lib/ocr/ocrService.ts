import sharp from 'sharp';
import path from 'path';
import os from 'os';

let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const { createWorker } = await import('tesseract.js');
        const workerPath = path.join(
          process.cwd(),
          'node_modules',
          'tesseract.js',
          'src',
          'worker-script',
          'node',
          'index.js'
        );

        const worker = await createWorker('eng', 1, {
          workerPath,
          // The hosted site's folders are read-only except the temp folder; the language data is saved there.
          cachePath: os.tmpdir(),
          errorHandler: (err: any) => console.warn('Tesseract worker error:', err),
        });
        return worker;
      } catch (err) {
        workerPromise = null;
        console.error('Failed to initialize Tesseract worker:', err);
        throw err;
      }
    })();
  }
  return workerPromise;
}

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ]);
}

// Ensure one OCR request at a time with isolation
let ocrQueue: Promise<any> = Promise.resolve();

export async function extractTextFromImage(imageSource: string): Promise<{ text: string; confidence: number; error?: string }> {
  return new Promise((resolve) => {
    ocrQueue = ocrQueue.catch(() => {}).then(async () => {
      try {
        const result = await withTimeout(
          (async () => {
            let imageBuffer: Buffer;
            
            if (imageSource.startsWith('data:image')) {
              const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
              imageBuffer = Buffer.from(base64Data, 'base64');
            } else if (imageSource.startsWith('http')) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              
              const response = await fetch(imageSource, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Researchie/1.0',
                },
              });
              clearTimeout(timeoutId);

              if (!response.ok) {
                throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
              }
              const arrayBuffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
            } else {
              throw new Error('Invalid image source. Must be a URL or a base64 string.');
            }

            let preprocessedBuffer: Buffer;
            try {
              preprocessedBuffer = await sharp(imageBuffer)
                .grayscale()
                .normalize()
                .sharpen()
                .toBuffer();
            } catch {
              // If sharp fails on unsupported image format, try raw buffer directly
              preprocessedBuffer = imageBuffer;
            }

            const worker = await getWorker();
            const { data: { text, confidence } } = await worker.recognize(preprocessedBuffer);
            
            return { text: (text || '').trim(), confidence: confidence || 0 };
          })(),
          // The first request on a cold server also downloads the English language data, so allow longer.
          50000,
          'OCR operation timed out after 50 seconds'
        );

        resolve(result);
      } catch (error: any) {
        console.error('OCR Error:', error?.message || error);
        resolve({ text: '', confidence: 0, error: String(error?.message || error) });
      }
    });
  });
}
