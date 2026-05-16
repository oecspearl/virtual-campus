/**
 * Tiny CSV streaming helpers.
 *
 * Building large CSVs in memory (`rows.join('\n')`) is the OOM trap for
 * any export that scales with student count. These helpers let a route
 * emit one row at a time through a Web ReadableStream so memory stays at
 * O(batch_size) instead of O(total_rows).
 *
 * Usage:
 *   return streamCsvResponse({
 *     filename: 'user-report-2026-05-16.csv',
 *     async produce(write) {
 *       write(['Name', 'Email']);              // header
 *       for await (const batch of paginate()) {
 *         for (const u of batch) write([u.name, u.email]);
 *       }
 *     },
 *   });
 */

/**
 * Escape a single CSV cell value per RFC 4180. Quotes wrap any value
 * that contains a comma, quote, newline, or leading/trailing whitespace;
 * embedded quotes are doubled.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s === '') return '';
  if (/[",\r\n]/.test(s) || /^\s/.test(s) || /\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Format one row as a CSV line WITHOUT the trailing newline. */
export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(',');
}

interface StreamCsvOptions {
  /** Filename for the Content-Disposition header. */
  filename: string;
  /**
   * Called once when the stream starts. Use the supplied `write(row)`
   * to emit each row (header + body); use `writeRaw(string)` for
   * pre-formatted chunks. Throw to fail the response.
   */
  produce: (
    write: (row: readonly unknown[]) => void,
    writeRaw: (text: string) => void,
  ) => Promise<void>;
  /** Extra response headers (e.g. cache-control overrides). */
  extraHeaders?: HeadersInit;
}

/**
 * Wrap a CSV-producing async function in a streamed Response.
 *
 * The default Cache-Control is `no-store` (exports change every time;
 * never cache them at the CDN). Override via `extraHeaders` if needed.
 */
export function streamCsvResponse(opts: StreamCsvOptions): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (row: readonly unknown[]) => {
        controller.enqueue(encoder.encode(csvRow(row) + '\r\n'));
      };
      const writeRaw = (text: string) => {
        controller.enqueue(encoder.encode(text));
      };

      try {
        await opts.produce(write, writeRaw);
        controller.close();
      } catch (err) {
        // Surfacing a JSON error mid-stream is too late — the client
        // already received `Content-Type: text/csv` and a 200. Log it
        // and abort the stream so the client sees a truncated download
        // rather than a deceptive "complete" file.
        console.error('CSV stream produce error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${opts.filename}"`,
      'Cache-Control': 'no-store',
      // Hint to clients/proxies that the body length isn't known up front.
      // Most servers strip this automatically for chunked encoding.
      'Transfer-Encoding': 'chunked',
      ...(opts.extraHeaders ?? {}),
    },
  });
}
