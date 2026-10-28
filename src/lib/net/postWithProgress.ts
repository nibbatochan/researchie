// fetch cannot report how much of a request body has been sent; XMLHttpRequest can. This is a small POST that
// reports the real fraction sent (0 to 1) and returns something shaped like a fetch Response (ok, status, json()).
// Used for document uploads so the progress bar follows the bytes, not a timer.

export interface ProgressResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

export function postWithProgress(
  url: string,
  body: FormData | string,
  opts: { headers?: Record<string, string>; onUpload?: (fraction: number) => void } = {}
): Promise<ProgressResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    for (const [k, v] of Object.entries(opts.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) opts.onUpload?.(Math.min(1, e.loaded / e.total));
    };
    xhr.upload.onload = () => opts.onUpload?.(1);
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.onload = () => {
      const text = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => JSON.parse(text),
      });
    };
    xhr.send(body);
  });
}
