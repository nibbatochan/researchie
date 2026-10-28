/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second dev server (for example accounts-required mode) run beside the first: NEXT_DIST_DIR=.next-auth
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // pdf-parse bundles its own pdf.js, which breaks when webpack bundles it for the server
  // (TypeError: Object.defineProperty called on non-object). Load it from node_modules instead.
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'sharp'],
  // OCR on Vercel (S-121): tesseract.js starts a worker from a file path that the build cannot find by following
  // imports, so keep it and sharp as real packages and copy the worker files into the /api/ocr function.
  outputFileTracingIncludes: {
    '/api/ocr': ['./node_modules/tesseract.js/**/*', './node_modules/tesseract.js-core/**/*'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
