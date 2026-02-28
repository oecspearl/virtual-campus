import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import type { SonisWebConnection, SoapResponse, ConnectionSettings } from './types';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// --- Credential Encryption ---

function getEncryptionKey(): Buffer {
  const key = process.env.SONISWEB_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SONISWEB_ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

export function encryptCredential(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptCredential(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- SOAP Client ---

export class SonisWebClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private settings: ConnectionSettings;

  constructor(connection: SonisWebConnection) {
    this.baseUrl = connection.base_url.replace(/\/+$/, '');
    this.username = connection.api_username;
    this.password = decryptCredential(connection.api_password_encrypted);
    this.settings = connection.settings || {};
  }

  /**
   * Test the connection by executing a simple SQL query.
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.executeSql("SELECT 1 AS test_connection");
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || 'Unknown error' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' };
    }
  }

  /**
   * Call a CFC method via soapapi.cfc.
   */
  async callApi(
    component: string,
    method: string,
    args?: Record<string, string>
  ): Promise<SoapResponse> {
    const argArray = args
      ? Object.entries(args).map(([name, value]) => `<item><name>${escapeXml(name)}</name><value>${escapeXml(value)}</value></item>`)
      : [];

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:son="http://sonisweb.com">
  <soapenv:Body>
    <son:doAPISomething>
      <son:user>${escapeXml(this.username)}</son:user>
      <son:pass>${escapeXml(this.password)}</son:pass>
      <son:comp>${escapeXml(component)}</son:comp>
      <son:meth>${escapeXml(method)}</son:meth>
      <son:hasReturnVariable>yes</son:hasReturnVariable>
      <son:argumentdata>${argArray.join('')}</son:argumentdata>
    </son:doAPISomething>
  </soapenv:Body>
</soapenv:Envelope>`;

    const url = `${this.baseUrl}/cfc/soapapi.cfc`;
    const xmlResponse = await this.makeRequest(url, soapBody, 'doAPISomething');
    return this.parseSoapResponse(xmlResponse);
  }

  /**
   * Execute a read-only SQL query via soapsql.cfc.
   */
  async executeSql(sql: string): Promise<SoapResponse> {
    // Safety: block write operations
    const normalized = sql.trim().toUpperCase();
    if (/^(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/.test(normalized)) {
      return {
        success: false,
        data: [],
        error: 'Only SELECT queries are allowed via soapsql endpoint',
      };
    }

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:son="http://sonisweb.com">
  <soapenv:Body>
    <son:doSQLSomething>
      <son:user>${escapeXml(this.username)}</son:user>
      <son:pass>${escapeXml(this.password)}</son:pass>
      <son:sql>${escapeXml(sql)}</son:sql>
    </son:doSQLSomething>
  </soapenv:Body>
</soapenv:Envelope>`;

    const url = `${this.baseUrl}/cfc/soapsql.cfc`;
    const xmlResponse = await this.makeRequest(url, soapBody, 'doSQLSomething');
    return this.parseSoapResponse(xmlResponse);
  }

  /**
   * Make an HTTP POST request to the SOAP endpoint with timeout and retry.
   */
  private async makeRequest(url: string, soapBody: string, soapAction: string): Promise<string> {
    const timeoutMs = this.settings.timeout_ms || 30000;
    const retryCount = this.settings.retry_count ?? 2;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': soapAction,
          },
          body: soapBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorBody.substring(0, 200)}`);
        }

        return await response.text();
      } catch (error: any) {
        lastError = error;
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${timeoutMs}ms`);
        }
        // Don't retry on non-retryable errors
        if (attempt < retryCount && isRetryable(error)) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 5000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Parse SOAP XML response into structured data rows.
   */
  private async parseSoapResponse(xmlString: string): Promise<SoapResponse> {
    try {
      const parsed = await parseStringPromise(xmlString, {
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')],
      });

      // Navigate SOAP envelope to find response body
      const envelope = parsed.Envelope || parsed['soapenv:Envelope'] || parsed;
      const body = envelope?.Body || envelope?.['soapenv:Body'] || envelope;

      // Look for the return value in various ColdFusion response patterns
      const responseData = findReturnData(body);

      if (responseData === null || responseData === undefined) {
        // Check for SOAP fault
        const fault = body?.Fault || body?.['soapenv:Fault'];
        if (fault) {
          return {
            success: false,
            data: [],
            raw_xml: xmlString.substring(0, 2000),
            error: fault.faultstring || fault.detail || 'SOAP Fault',
          };
        }
        return { success: true, data: [], raw_xml: xmlString.substring(0, 2000) };
      }

      // ColdFusion query results typically come as columns + data
      const rows = extractRows(responseData);

      return {
        success: true,
        data: rows,
        columns: Object.keys(rows[0] || {}),
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        raw_xml: xmlString.substring(0, 2000),
        error: `XML parse error: ${error.message}`,
      };
    }
  }
}

/**
 * Factory function for creating a SonisWeb client.
 */
export function createSonisWebClient(connection: SonisWebConnection): SonisWebClient {
  return new SonisWebClient(connection);
}

// --- Helpers ---

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isRetryable(error: any): boolean {
  if (error.name === 'AbortError') return true;
  if (error.message?.includes('ECONNRESET')) return true;
  if (error.message?.includes('ECONNREFUSED')) return true;
  if (error.message?.includes('ETIMEDOUT')) return true;
  if (error.message?.includes('HTTP 5')) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Recursively search the parsed XML for the return data.
 * ColdFusion SOAP responses nest data in various ways.
 */
function findReturnData(obj: any): any {
  if (!obj || typeof obj !== 'object') return null;

  // Look for common return value keys
  for (const key of ['return', 'doAPISomethingReturn', 'doSQLSomethingReturn', 'returnValue']) {
    if (obj[key] !== undefined) return obj[key];
  }

  // Recurse into child objects
  for (const key of Object.keys(obj)) {
    const result = findReturnData(obj[key]);
    if (result !== null) return result;
  }

  return null;
}

/**
 * Extract rows from ColdFusion query result format.
 * CF returns either:
 *   - A 2D structure with COLUMNS array and DATA array
 *   - A simple array of objects
 *   - A single record as an object
 */
function extractRows(data: any): Record<string, any>[] {
  if (Array.isArray(data)) {
    // Already an array of records
    return data.map(item => (typeof item === 'object' ? item : { value: item }));
  }

  if (typeof data === 'object') {
    // ColdFusion query format: { COLUMNS: [...], DATA: [[...], [...]] }
    const columns = data.COLUMNS || data.columns;
    const rows = data.DATA || data.data;

    if (Array.isArray(columns) && Array.isArray(rows)) {
      const colNames = Array.isArray(columns) ? columns : [columns];
      return rows.map((row: any) => {
        const record: Record<string, any> = {};
        const rowArray = Array.isArray(row) ? row : [row];
        colNames.forEach((col: string, i: number) => {
          record[col.toLowerCase()] = rowArray[i] ?? null;
        });
        return record;
      });
    }

    // Single record
    return [data];
  }

  return [{ value: data }];
}
