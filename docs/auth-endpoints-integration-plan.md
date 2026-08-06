# Auth Endpoints Integration Plan

Integrate the React Native app (`wdkqualification`) with the WDK NestJS backend
(`wdkqualification-backend`) auth endpoints: **Google login** and **token
refresh**.

## Decisions (confirmed)

- **Full auth client** with automatic `401 → /auth/refresh → retry` interceptor.
- **axios** as the HTTP layer.
- **Session model** replaces the current `GoogleAccount`
  (`{ accessToken, refreshToken, user }`).
- **`API_BASE_URL`** via `@env` with a platform-aware dev default.

## Backend contract (reference)

Global prefix: `/api` (see `main.ts` `setGlobalPrefix('api')`), port `3000`.

| Endpoint                 | Body                                    | Response                              |
| ------------------------ | --------------------------------------- | ------------------------------------- |
| `POST /api/auth/google`  | `{ idToken, type: 'ios' \| 'android' }` | `{ accessToken, refreshToken, user }` |
| `POST /api/auth/refresh` | `{ refreshToken }`                      | `{ accessToken, refreshToken, user }` |

- `user = { id, email, firstName, lastName }` — string fields are nullable.
- Error envelope (from `GlobalExceptionFilter`):
  `{ statusCode, timestamp, path, message, error?, additional_data? }`.
- Refresh is **stateless JWT** and returns a **fresh** `refreshToken` each call;
  the previous refresh token stays valid until expiry (no reuse detection). We
  persist the newest tokens.
- `POST /api/auth/refresh` returns `401` with message `INVALID_REFRESH_TOKEN`
  when the refresh token is invalid/expired.

## Current frontend state (relevant findings)

- `AuthStore.signInWithGoogle()` already runs the Google SDK flow and obtains
  `response.data.idToken`, but only persists `{ email, logged }` to the keychain
  and never calls the backend — the idToken is discarded.
- No HTTP client exists (`src/shared/api/index.ts` is empty; no axios).
- Env via `react-native-dotenv` (`@env`); types in `env.d.ts` and
  `src/types/env.d.ts`. No `API_BASE_URL` yet.
- `src/shared/lib/authStorage.ts` persists a `GoogleAccount`, not tokens.
- `GoogleSignin.configure({ webClientId, iosClientId })` is set up in `App.tsx`.
- Path aliases available: `@app`, `@screens`, `@widgets`, `@features`,
  `@entities`, `@shared`.

---

## 1. Dependency & env

- Add `axios` to `package.json` dependencies.
- Add `API_BASE_URL` to `env.d.ts` and `src/types/env.d.ts`, plus `.env` and
  `.env.example`.
- `src/shared/config/index.ts`: export `apiBaseUrl`, resolved in this order:

  1. `API_BASE_URL` from `@env` if set;
  2. platform default:
     `Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api'`.

  The `/api` global prefix is baked into this value.

## 2. HTTP client — `src/shared/api/httpClient.ts`

- `axios.create({ baseURL: apiBaseUrl, timeout, headers: { 'Content-Type': 'application/json' } })`.
- **Request interceptor**: read the in-memory access token from an injected
  provider and set `Authorization: Bearer <token>`.
- **Response interceptor**: on `401` (excluding the `/auth/refresh` and
  `/auth/google` calls), run a single shared refresh routine:
  - De-dupe concurrent 401s behind one in-flight refresh promise; refresh once,
    then replay all queued requests.
  - On success: persist new tokens, update the Authorization header, retry the
    original request.
  - On failure: clear session → force sign-out via callback so `AuthStore` can
    reset and navigation can return to SignIn.
- Avoid a circular dependency (client ↔ store) by exposing
  `configureAuth({ getAccessToken, onTokensRefreshed, onAuthFailure })` that
  `AuthStore` wires up at construction.
- Normalize failures into a small `ApiError` that reads `message` from the
  backend error envelope.

## 3. Typed auth API — `src/shared/api/auth.ts` + `src/shared/api/types.ts`

- Types: `AuthUser`, `AuthTokens` (`{ accessToken, refreshToken, user }`),
  `EClientType` mirror (`'ios' | 'android'`).
- `authApi.google(idToken, type)` → `POST /auth/google`.
- `authApi.refresh(refreshToken)` → `POST /auth/refresh`, using a **bare** axios
  call without the auth interceptor to avoid recursion.
- Re-export from `src/shared/api/index.ts`.

## 4. Session storage — refactor `src/shared/lib/authStorage.ts`

- Replace `GoogleAccount` persistence with a `Session` blob
  (`{ accessToken, refreshToken, user }`) under a new keychain service
  (e.g. `com.wdkqualification.session`).
- Functions: `saveSession`, `loadSession`, `clearSession`. Keep the JSON-parse
  guard for corrupted/legacy payloads.
- Replace `saveGoogleAccount` / `loadGoogleAccount` / `clearGoogleAccount` and
  update `src/shared/lib/index.ts`.

## 5. `AuthStore` refactor — `src/shared/store/domains/AuthStore.ts`

- State: `session: Session | null`, `isHydrated`.
  `isAuthenticated = !!session?.accessToken`. Expose `user`.
- Constructor wires `httpClient.configureAuth(...)`:
  - `getAccessToken` → `this.session?.accessToken`;
  - `onTokensRefreshed` → persist + update state;
  - `onAuthFailure` → `signOut`.
- `hydrate()`: load session from keychain, set `isHydrated`.
- `signInWithGoogle()`: run Google SDK flow → get `idToken` → `authApi.google(idToken, Platform.OS)`
  → persist + set session; returns success boolean. Keep cancel/error handling.
- `refresh()`: `authApi.refresh(...)`, persist rotated tokens.
- `signOut()`: `clearSession()` + `GoogleSignin.signOut()` + reset state.

## 6. Wiring

- `App.tsx`: flow unchanged; `hydrate()` still called on startup.
- `SignInScreen`: no change — still calls `signInWithGoogle()`.
- Add `EClientType` mapping from `Platform.OS` to the backend enum.

---

## Open items / call-outs

1. **idToken source**: `signIn()` returns `idToken` directly. If it comes back
   null (an Android edge case), fall back to `GoogleSignin.getTokens()`.
2. **Refresh token rotation**: backend issues a new refresh token each refresh
   but old JWTs remain valid until expiry (stateless). We store the newest. No
   reuse-detection gotcha.
3. **Physical device dev**: `10.0.2.2` / `localhost` only work on emulators; a
   real device needs the host machine's LAN IP via `API_BASE_URL`. Documented in
   `.env.example`.
4. **Backend running**: assumes the backend is reachable at `:3000`. Not started
   as part of this work.

## Implementation order

1. env / config
2. http client
3. api layer
4. session storage
5. AuthStore
6. wiring / types

## Files touched

- `package.json` (add axios)
- `env.d.ts`, `src/types/env.d.ts`, `.env`, `.env.example`
- `src/shared/config/index.ts`
- `src/shared/api/httpClient.ts` (new)
- `src/shared/api/auth.ts` (new)
- `src/shared/api/types.ts` (new)
- `src/shared/api/index.ts`
- `src/shared/lib/authStorage.ts`
- `src/shared/lib/index.ts`
- `src/shared/store/domains/AuthStore.ts`
