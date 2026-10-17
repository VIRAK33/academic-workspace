import { PushSubscriptionRecord } from '../types';

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BLJkRpNyveun6nsw3J-aQnHgkJ6zyoDoRJMB5wB01kUbRgGrcM5H4br47yIY2SMP0IauAGFPTvYhQMtp0517IMc';
export const DEFAULT_VAPID_PRIVATE_KEY =
  'tavR5nTD482hmPgPuvCwtpE7Dd1CT2yXnk7hFlhCByQ';
export const DEFAULT_VAPID_SUBJECT = 'mailto:virak.dev@gmail.com';

export interface PushEnv {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBuf(str: string): Uint8Array {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates an ES256 VAPID JWT for web push authentication
 */
async function createVapidJwt(
  aud: string,
  subject: string,
  privateKeyD: string,
  publicKeyRaw: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  const payload = { aud, exp, sub: subject };

  const encodedHeader = b64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Decode public key raw bytes to extract x and y coordinates (65 bytes: 0x04 + 32 x + 32 y)
  const pubBytes = b64urlToBuf(publicKeyRaw);
  const x = b64url(pubBytes.slice(1, 33));
  const y = b64url(pubBytes.slice(33, 65));

  // Import ECDSA private key from JWK
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: privateKeyD,
    ext: false,
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${b64url(signature)}`;
}

/**
 * Encrypts payload using RFC 8291 (aes128gcm) Web Push Content Encoding
 */
async function encryptPayload(
  clientP256dh: string,
  clientAuth: string,
  payloadStr: string
): Promise<Uint8Array> {
  const userPubBuf = b64urlToBuf(clientP256dh);
  const userAuthBuf = b64urlToBuf(clientAuth);

  // Generate ephemeral ECDH keypair
  const serverEcdh = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverEcdh.publicKey));

  // Import client public key
  const importedUserKey = await crypto.subtle.importKey(
    'raw',
    userPubBuf as unknown as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared ECDH secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserKey },
    serverEcdh.privateKey,
    256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive IKM using auth secret
  const webPushInfoPrefix = new TextEncoder().encode('WebPush: info\0');
  const webPushInfo = new Uint8Array(webPushInfoPrefix.length + userPubBuf.length + serverPubRaw.length);
  webPushInfo.set(webPushInfoPrefix, 0);
  webPushInfo.set(userPubBuf, webPushInfoPrefix.length);
  webPushInfo.set(serverPubRaw, webPushInfoPrefix.length + userPubBuf.length);

  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: userAuthBuf as unknown as BufferSource, info: webPushInfo as unknown as BufferSource },
    await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']),
    256
  );

  const prkKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits', 'deriveKey']);

  // Derive Content Encryption Key (CEK)
  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as unknown as BufferSource, info: new TextEncoder().encode('Content-Encoding: aes128gcm\0') as unknown as BufferSource },
    prkKey,
    128
  );

  // Derive Nonce
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as unknown as BufferSource, info: new TextEncoder().encode('Content-Encoding: nonce\0') as unknown as BufferSource },
    prkKey,
    96
  );


  // Encrypt with AES-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintextBytes = new TextEncoder().encode(payloadStr);
  const paddedPlaintext = new Uint8Array(plaintextBytes.length + 1);
  paddedPlaintext.set(plaintextBytes, 0);
  paddedPlaintext[plaintextBytes.length] = 2; // Delimiter for final record (RFC 8188)

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPlaintext
  );
  const ciphertext = new Uint8Array(ciphertextBuf);

  // Assemble aes128gcm header:
  // salt (16 bytes) + record_size (4 bytes uint32 BE = 4096) + idlen (1 byte = 65) + serverPubRaw (65 bytes) + ciphertext
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPubRaw.length);
  header.set(salt, 0);

  const view = new DataView(header.buffer);
  view.setUint32(16, recordSize, false); // big-endian
  header[20] = serverPubRaw.length;
  header.set(serverPubRaw, 21);

  const fullBody = new Uint8Array(header.length + ciphertext.length);
  fullBody.set(header, 0);
  fullBody.set(ciphertext, header.length);

  return fullBody;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a Web Push Notification to a subscription endpoint
 */
export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: WebPushPayload,
  env?: PushEnv
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const pubKey = env?.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
    const privKey = env?.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
    const subject = env?.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

    const endpointUrl = new URL(sub.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const vapidJwt = await createVapidJwt(audience, subject, privKey, pubKey);
    const encryptedBody = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(payload));

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400', // 24 hours
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${vapidJwt}, k=${pubKey}`,
      },
      body: encryptedBody as unknown as BodyInit,
    });

    if (response.status === 201 || response.status === 200 || response.status === 202) {
      return { success: true, status: response.status };
    }

    const errText = await response.text();
    return { success: false, status: response.status, error: errText };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
