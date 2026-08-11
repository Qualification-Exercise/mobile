import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  CloudKeyProviderError,
  type CloudAuthorizationOutcome,
  type CloudKeyLookupResult,
  type CloudKeyProvider,
} from '@shared/lib/cloudKeyProvider';
import {
  DRIVE_KEY_ENVELOPE_FILE_NAME,
  MAX_DRIVE_KEY_ENVELOPE_BYTES,
  createDriveKeyEnvelope,
  parseDriveKeyEnvelope,
  serializeDriveKeyEnvelope,
  type DriveKeyEnvelopeV1,
} from '@shared/lib/driveKeyEnvelope';

export const GOOGLE_DRIVE_APP_DATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_FILE_MIME_TYPE = 'application/json';
const DRIVE_REQUEST_TIMEOUT_MS = 15000;
const MAX_LIST_PAGES = 10;
const MAX_MATCHING_FILES = 20;
const MAX_LIST_RESPONSE_BYTES = 64 * 1024;
const LIST_PAGE_SIZE = 100;
const MULTIPART_BOUNDARY = 'wdk-wallet-backup-boundary';

// The minimal slice of @react-native-google-signin the client relies on to
// obtain and refresh a Drive access token. Declared here so the client can be
// unit-tested against a fake sign-in client.
export interface GoogleSignInAuthorizationClient {
  hasPlayServices(options: {
    showPlayServicesUpdateDialog: boolean;
  }): Promise<boolean>;
  signInSilently(): Promise<GoogleSignInSilentResponse>;
  addScopes(options: {
    scopes: string[];
  }): Promise<GoogleSignInResponse | null>;
  getTokens(): Promise<{ accessToken: string }>;
  clearCachedAccessToken(accessToken: string): Promise<unknown>;
}

type GoogleSignInSuccessResponse = {
  type: 'success';
  data: { scopes: string[] };
};

type GoogleSignInResponse =
  | GoogleSignInSuccessResponse
  | { type: 'cancelled'; data: null };

type GoogleSignInSilentResponse =
  | GoogleSignInSuccessResponse
  | { type: 'noSavedCredentialFound'; data: null };

type AuthorizationRequest = {
  interactive: boolean;
  promise: Promise<CloudAuthorizationOutcome>;
};

type DriveFileMetadata = {
  id: string;
  name: string;
  size: number;
};

type LogicalDriveFile = {
  envelope: DriveKeyEnvelopeV1;
  serialized: string;
};

// Google Drive API instance. Non-2xx statuses resolve (rather than throw) so
// the client can map them to typed errors, and bodies stay as raw text so
// their byte length can be bounded before parsing.
const driveHttp = axios.create({
  timeout: DRIVE_REQUEST_TIMEOUT_MS,
  responseType: 'text',
  transformResponse: value => value,
  validateStatus: () => true,
});

function parseContentLength(value: string | null): number | null {
  if (value == null || !/^\d+$/.test(value)) {
    return null;
  }
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

// Read a single response header regardless of whether the instance exposes it
// as an AxiosHeaders object (with `get`) or a plain record.
function headerValue(
  headers: AxiosResponse['headers'],
  name: string,
): string | null {
  const source = headers as unknown as {
    get?: (name: string) => unknown;
  } & Record<string, unknown>;
  const raw =
    typeof source?.get === 'function' ? source.get(name) : source?.[name];
  if (raw == null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value == null ? null : String(value);
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

// Reads and writes the wallet backup encryption key as a single JSON envelope
// in the caller's Google Drive appDataFolder. Owns both the Google sign-in
// authorization flow and the Drive REST calls.
export class GoogleDriveClient implements CloudKeyProvider {
  private authorizationRequest: AuthorizationRequest | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(
    private readonly signIn: GoogleSignInAuthorizationClient = GoogleSignin,
    private readonly http: AxiosInstance = driveHttp,
  ) {}

  authorize(interactive: boolean): Promise<CloudAuthorizationOutcome> {
    const currentRequest = this.authorizationRequest;
    if (currentRequest) {
      if (currentRequest.interactive || !interactive) {
        return currentRequest.promise;
      }

      return currentRequest.promise.then(outcome => {
        if (outcome.status !== 'denied') {
          return outcome;
        }
        return this.authorize(true);
      });
    }

    const promise = this.performAuthorization(interactive).finally(() => {
      if (this.authorizationRequest?.promise === promise) {
        this.authorizationRequest = null;
      }
    });
    this.authorizationRequest = { interactive, promise };
    return promise;
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

  // ---- Authorization ----

  private async performAuthorization(
    interactive: boolean,
  ): Promise<CloudAuthorizationOutcome> {
    try {
      const servicesAvailable = await this.signIn.hasPlayServices({
        showPlayServicesUpdateDialog: interactive,
      });
      if (!servicesAvailable) {
        return { status: 'unavailable' };
      }

      const silentResponse = await this.signIn.signInSilently();
      if (silentResponse.type === 'noSavedCredentialFound') {
        return { status: 'signed_out' };
      }
      if (this.hasDriveScope(silentResponse)) {
        return { status: 'authorized' };
      }
      if (!interactive) {
        return { status: 'denied' };
      }

      const response = await this.signIn.addScopes({
        scopes: [GOOGLE_DRIVE_APP_DATA_SCOPE],
      });
      if (response == null) {
        return { status: 'signed_out' };
      }
      if (response.type === 'cancelled') {
        return { status: 'cancelled' };
      }
      return this.hasDriveScope(response)
        ? { status: 'authorized' }
        : { status: 'denied' };
    } catch (error) {
      return this.classifyKnownError(error);
    }
  }

  private classifyKnownError(error: unknown): CloudAuthorizationOutcome {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'unavailable' };
      }
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        return { status: 'signed_out' };
      }
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { status: 'cancelled' };
      }
    }

    throw new CloudKeyProviderError('authorization_failed');
  }

  private hasDriveScope(response: GoogleSignInSuccessResponse): boolean {
    return response.data.scopes.includes(GOOGLE_DRIVE_APP_DATA_SCOPE);
  }

  private getAccessToken(): Promise<string> {
    if (this.tokenRequest) {
      return this.tokenRequest;
    }

    const promise = this.loadAccessToken().finally(() => {
      if (this.tokenRequest === promise) {
        this.tokenRequest = null;
      }
    });
    this.tokenRequest = promise;
    return promise;
  }

  private async loadAccessToken(): Promise<string> {
    try {
      const { accessToken } = await this.signIn.getTokens();
      if (!accessToken) {
        throw new CloudKeyProviderError('token_unavailable');
      }
      return accessToken;
    } catch (error) {
      if (error instanceof CloudKeyProviderError) {
        throw error;
      }
      throw new CloudKeyProviderError('token_unavailable');
    }
  }

  private async clearCachedAccessToken(accessToken: string): Promise<void> {
    if (!accessToken) {
      throw new CloudKeyProviderError('token_unavailable');
    }

    try {
      await this.signIn.clearCachedAccessToken(accessToken);
    } catch {
      throw new CloudKeyProviderError('token_unavailable');
    }
  }

  // ---- Drive files ----

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

      const response = await this.request({
        method: 'get',
        url: `${DRIVE_API_URL}/files?${query.join('&')}`,
      });
      const serialized = this.boundedBody(response, MAX_LIST_RESPONSE_BYTES);
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
    const response = await this.request({
      method: 'get',
      url: `${DRIVE_API_URL}/files/${encodeURIComponent(file.id)}?alt=media`,
    });
    const serialized = this.boundedBody(response, MAX_DRIVE_KEY_ENVELOPE_BYTES);
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

    await this.request({
      method: 'post',
      url: `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id`,
      headers: {
        'Content-Type': `multipart/related; boundary=${MULTIPART_BOUNDARY}`,
      },
      data: body,
    });
  }

  private async updateKeyFile(id: string, serialized: string): Promise<void> {
    await this.request({
      method: 'patch',
      url: `${DRIVE_UPLOAD_URL}/files/${encodeURIComponent(
        id,
      )}?uploadType=media&fields=id`,
      headers: { 'Content-Type': DRIVE_FILE_MIME_TYPE },
      data: serialized,
    });
  }

  // ---- HTTP ----

  // Sends an authorized request, transparently refreshing a stale token once on
  // a 401, and maps Drive's status codes to typed provider errors.
  private async request(
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<string>> {
    const first = await this.requestWithToken(config);
    if (first.response.status !== 401) {
      return this.ensureSuccess(first.response);
    }

    await this.clearCachedAccessToken(first.accessToken);
    const retried = await this.requestWithToken(config);
    return this.ensureSuccess(retried.response);
  }

  private ensureSuccess(
    response: AxiosResponse<string>,
  ): AxiosResponse<string> {
    if (response.status === 401) {
      throw new CloudKeyProviderError('unauthorized');
    }
    if (response.status === 403) {
      throw new CloudKeyProviderError('permission_denied');
    }
    if (response.status < 200 || response.status >= 300) {
      throw new CloudKeyProviderError('network_error');
    }
    return response;
  }

  private async requestWithToken(
    config: AxiosRequestConfig,
  ): Promise<{ response: AxiosResponse<string>; accessToken: string }> {
    const accessToken = await this.getAccessToken();
    try {
      const response = await this.http.request<string>({
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return { response, accessToken };
    } catch {
      throw new CloudKeyProviderError('network_error');
    }
  }

  private boundedBody(
    response: AxiosResponse<string>,
    maxBytes: number,
  ): string {
    const declaredLength = parseContentLength(
      headerValue(response.headers, 'content-length'),
    );
    if (declaredLength != null && declaredLength > maxBytes) {
      throw new CloudKeyProviderError('response_too_large');
    }
    const body = typeof response.data === 'string' ? response.data : '';
    if (utf8ByteLength(body) > maxBytes) {
      throw new CloudKeyProviderError('response_too_large');
    }
    return body;
  }
}
