import {
  CloudKeyProviderError,
  type CloudAuthorizationOutcome,
  type CloudKeyLookupResult,
  type CloudKeyProvider,
} from '@shared/lib/wallet-backup';
import {
  DRIVE_KEY_ENVELOPE_FILE_NAME,
  MAX_DRIVE_KEY_ENVELOPE_BYTES,
  createDriveKeyEnvelope,
  parseDriveKeyEnvelope,
  serializeDriveKeyEnvelope,
} from './driveKeyEnvelope';
import {
  googleDriveAuthorization,
  type GoogleDriveAuthorization,
} from './GoogleDriveAuthorization';
import type { DriveKeyEnvelopeV1 } from './types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_FILE_MIME_TYPE = 'application/json';
const MAX_LIST_PAGES = 10;
const MAX_MATCHING_FILES = 20;
const MAX_LIST_RESPONSE_BYTES = 64 * 1024;
const LIST_PAGE_SIZE = 100;
const MULTIPART_BOUNDARY = 'wdk-wallet-backup-boundary';

export type DriveHttpResponse = {
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
};

export type DriveHttpRequest = {
  method: 'GET' | 'POST' | 'PATCH';
  headers: Record<string, string>;
  body?: string;
};

export type DriveTransport = (
  url: string,
  request: DriveHttpRequest,
) => Promise<DriveHttpResponse>;

export type DriveAuthorization = Pick<
  GoogleDriveAuthorization,
  'authorize' | 'withAccessToken' | 'clearCachedAccessToken'
>;

type DriveFileMetadata = {
  id: string;
  name: string;
  size: number;
};

type LogicalDriveFile = {
  envelope: DriveKeyEnvelopeV1;
  serialized: string;
};

function defaultDriveTransport(
  url: string,
  request: DriveHttpRequest,
): Promise<DriveHttpResponse> {
  return fetch(url, request) as Promise<DriveHttpResponse>;
}

function parseContentLength(value: string | null): number | null {
  if (value == null || !/^\d+$/.test(value)) {
    return null;
  }
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

function utf8ByteLength(value: string): number {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint == null) {
      continue;
    }
    if (codePoint <= 0x7f) {
      byteLength += 1;
    } else if (codePoint <= 0x7ff) {
      byteLength += 2;
    } else if (codePoint <= 0xffff) {
      byteLength += 3;
    } else {
      byteLength += 4;
      index += 1;
    }
  }
  return byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export class GoogleDriveKeyProvider implements CloudKeyProvider {
  constructor(
    private readonly authorization: DriveAuthorization = googleDriveAuthorization,
    private readonly transport: DriveTransport = defaultDriveTransport,
  ) {}

  async authorize(interactive: boolean): Promise<CloudAuthorizationOutcome> {
    return this.authorization.authorize(interactive);
  }

  async getEncryptionKey(): Promise<CloudKeyLookupResult> {
    const files = await this.listKeyFiles();
    if (files.length === 0) {
      return { status: 'not_found' };
    }

    const logicalFile = await this.readLogicalFile(files);
    return {
      status: 'found',
      encryptionKey: logicalFile.envelope.encryptionKey,
    };
  }

  async putEncryptionKey(encryptionKey: string): Promise<void> {
    let serialized: string;
    try {
      const envelope = createDriveKeyEnvelope({ encryptionKey });
      serialized = serializeDriveKeyEnvelope(envelope);
    } catch {
      throw new CloudKeyProviderError('invalid_response');
    }
    const files = await this.listKeyFiles();
    if (files.length === 0) {
      await this.createKeyFile(serialized);
      return;
    }

    if (files.length > 1) {
      await this.readLogicalFile(files);
    }

    await Promise.all(
      files.map(file => this.updateKeyFile(file.id, serialized)),
    );
  }

  private async listKeyFiles(): Promise<DriveFileMetadata[]> {
    const files: DriveFileMetadata[] = [];
    let pageToken: string | null = null;

    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      const query = [
        'spaces=appDataFolder',
        `q=${encodeURIComponent(
          `name = '${DRIVE_KEY_ENVELOPE_FILE_NAME}' and trashed = false`,
        )}`,
        'fields=nextPageToken%2Cfiles%28id%2Cname%2Csize%29',
        `pageSize=${LIST_PAGE_SIZE}`,
      ];
      if (pageToken) {
        query.push(`pageToken=${encodeURIComponent(pageToken)}`);
      }

      const response = await this.request(
        `${DRIVE_API_URL}/files?${query.join('&')}`,
        { method: 'GET', headers: {} },
      );
      const serialized = await this.readBoundedText(
        response,
        MAX_LIST_RESPONSE_BYTES,
      );
      const parsed = this.parseListPage(serialized);
      files.push(...parsed.files);
      if (files.length > MAX_MATCHING_FILES) {
        throw new CloudKeyProviderError('remote_invariant');
      }
      if (!parsed.nextPageToken) {
        return files;
      }
      pageToken = parsed.nextPageToken;
    }

    throw new CloudKeyProviderError('invalid_response');
  }

  private parseListPage(serialized: string): {
    files: DriveFileMetadata[];
    nextPageToken: string | null;
  } {
    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch {
      throw new CloudKeyProviderError('invalid_response');
    }
    if (!isRecord(value) || !Array.isArray(value.files)) {
      throw new CloudKeyProviderError('invalid_response');
    }

    const nextPageToken = value.nextPageToken;
    if (nextPageToken != null && typeof nextPageToken !== 'string') {
      throw new CloudKeyProviderError('invalid_response');
    }

    const files = value.files.map(file => {
      if (
        !isRecord(file) ||
        typeof file.id !== 'string' ||
        file.id.length === 0 ||
        file.name !== DRIVE_KEY_ENVELOPE_FILE_NAME ||
        typeof file.size !== 'string' ||
        !/^\d+$/.test(file.size)
      ) {
        throw new CloudKeyProviderError('invalid_response');
      }
      const size = Number(file.size);
      if (!Number.isSafeInteger(size) || size > MAX_DRIVE_KEY_ENVELOPE_BYTES) {
        throw new CloudKeyProviderError('response_too_large');
      }
      return { id: file.id, name: file.name, size };
    });

    return { files, nextPageToken: nextPageToken ?? null };
  }

  private async readLogicalFile(
    files: DriveFileMetadata[],
  ): Promise<LogicalDriveFile> {
    const contents = await Promise.all(
      files.map(file => this.downloadKeyFile(file)),
    );
    const first = contents[0];
    if (!first) {
      throw new CloudKeyProviderError('invalid_response');
    }
    if (contents.some(content => content.serialized !== first.serialized)) {
      throw new CloudKeyProviderError('remote_invariant');
    }
    return first;
  }

  private async downloadKeyFile(
    file: DriveFileMetadata,
  ): Promise<LogicalDriveFile> {
    if (file.size > MAX_DRIVE_KEY_ENVELOPE_BYTES) {
      throw new CloudKeyProviderError('response_too_large');
    }
    const response = await this.request(
      `${DRIVE_API_URL}/files/${encodeURIComponent(file.id)}?alt=media`,
      { method: 'GET', headers: {} },
    );
    const serialized = await this.readBoundedText(
      response,
      MAX_DRIVE_KEY_ENVELOPE_BYTES,
    );
    try {
      const envelope = parseDriveKeyEnvelope(serialized);
      return {
        serialized: serializeDriveKeyEnvelope(envelope),
        envelope,
      };
    } catch {
      throw new CloudKeyProviderError('invalid_response');
    }
  }

  private async createKeyFile(serialized: string): Promise<void> {
    const metadata = JSON.stringify({
      name: DRIVE_KEY_ENVELOPE_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: DRIVE_FILE_MIME_TYPE,
    });
    const body = [
      `--${MULTIPART_BOUNDARY}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${MULTIPART_BOUNDARY}`,
      `Content-Type: ${DRIVE_FILE_MIME_TYPE}`,
      '',
      serialized,
      `--${MULTIPART_BOUNDARY}--`,
      '',
    ].join('\r\n');

    await this.request(
      `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${MULTIPART_BOUNDARY}`,
        },
        body,
      },
    );
  }

  private async updateKeyFile(id: string, serialized: string): Promise<void> {
    await this.request(
      `${DRIVE_UPLOAD_URL}/files/${encodeURIComponent(
        id,
      )}?uploadType=media&fields=id`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': DRIVE_FILE_MIME_TYPE },
        body: serialized,
      },
    );
  }

  private async request(
    url: string,
    request: DriveHttpRequest,
  ): Promise<DriveHttpResponse> {
    let result = await this.requestWithToken(url, request);
    if (result.response.status === 401) {
      await this.authorization.clearCachedAccessToken(result.accessToken);
      result = await this.requestWithToken(url, request);
    }
    if (result.response.status === 401) {
      throw new CloudKeyProviderError('unauthorized');
    }
    if (result.response.status === 403) {
      throw new CloudKeyProviderError('permission_denied');
    }
    if (!result.response.ok) {
      throw new CloudKeyProviderError('network_error');
    }
    return result.response;
  }

  private requestWithToken(
    url: string,
    request: DriveHttpRequest,
  ): Promise<{ response: DriveHttpResponse; accessToken: string }> {
    return this.authorization.withAccessToken(async accessToken => {
      try {
        const response = await this.transport(url, {
          ...request,
          headers: {
            ...request.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return { response, accessToken };
      } catch {
        throw new CloudKeyProviderError('network_error');
      }
    });
  }

  private async readBoundedText(
    response: DriveHttpResponse,
    maxBytes: number,
  ): Promise<string> {
    const contentLength = parseContentLength(
      response.headers.get('content-length'),
    );
    if (contentLength != null && contentLength > maxBytes) {
      throw new CloudKeyProviderError('response_too_large');
    }
    let serialized: string;
    try {
      serialized = await response.text();
    } catch {
      throw new CloudKeyProviderError('network_error');
    }
    const byteLength = utf8ByteLength(serialized);
    if (byteLength > maxBytes) {
      throw new CloudKeyProviderError('response_too_large');
    }
    return serialized;
  }
}

export const googleDriveKeyProvider = new GoogleDriveKeyProvider();
