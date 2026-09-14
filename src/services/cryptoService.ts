/**
 * SIMPAN Local Crypto Service
 * Enkripsi client-side berbasis Web Crypto API (SubtleCrypto)
 * - Standar: AES-GCM 256-bit
 * - Key Derivation: PBKDF2 dengan 100.000 iterasi SHA-256
 * Digunakan untuk mengamankan data rahasia dan berkas cadangan .simpan
 */

// Salt tetap per instalasi untuk derivasi kunci
const DEFAULT_SALT = new TextEncoder().encode('SIMPAN_LOCAL_ARCHIVE_SALT_v1');

export async function deriveKeyFromPIN(pin: string, salt: Uint8Array = DEFAULT_SALT): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Enkripsi string teks biasa menjadi Base64 string terenkripsi
 */
export async function encryptData(plainText: string, pin: string): Promise<string> {
  if (!plainText || !pin) return plainText;
  try {
    const key = await deriveKeyFromPIN(pin);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standar AES-GCM
    const enc = new TextEncoder();

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      enc.encode(plainText)
    );

    // Gabungkan IV + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Encode ke Base64
    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return 'enc:' + btoa(binary);
  } catch (err) {
    console.warn('Encryption failed, returning plain:', err);
    return plainText;
  }
}

/**
 * Dekripsi Base64 string terenkripsi kembali ke teks biasa
 */
export async function decryptData(cipherData: string, pin: string): Promise<string> {
  if (!cipherData || !cipherData.startsWith('enc:') || !pin) return cipherData;
  try {
    const rawBase64 = cipherData.slice(4);
    const binary = atob(rawBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await deriveKeyFromPIN(pin);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('Decryption failed:', err);
    return cipherData;
  }
}
