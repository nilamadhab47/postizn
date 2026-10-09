import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  decryptSecretWithKeys,
  encryptSecret,
  isEncryptedSecret,
  keyFromSecret,
} from "./token-crypto";

const KEY_A = keyFromSecret("token-encryption-key-a-32chars-min!!");
const KEY_B = keyFromSecret("legacy-jwt-secret-key-32chars-min!!");

describe("token-crypto", () => {
  it("round-trips ciphertext", () => {
    const packed = encryptSecret("linkedin-refresh", KEY_A);
    expect(isEncryptedSecret(packed)).toBe(true);
    expect(decryptSecret(packed, KEY_A)).toBe("linkedin-refresh");
  });

  it("does not decrypt with the wrong key", () => {
    const packed = encryptSecret("secret", KEY_A);
    expect(() => decryptSecret(packed, KEY_B)).toThrow();
  });

  it("refuses plaintext when allowPlaintext is false", () => {
    expect(() =>
      decryptSecret("plain-token", KEY_A, { allowPlaintext: false }),
    ).toThrow(/plaintext/);
  });

  it("returns plaintext in development mode", () => {
    expect(decryptSecret("plain-token", KEY_A, { allowPlaintext: true })).toBe(
      "plain-token",
    );
  });

  it("decrypts with a legacy key and marks rotation", () => {
    const packed = encryptSecret("x-refresh", KEY_B);
    const opened = decryptSecretWithKeys(packed, [KEY_A, KEY_B], {
      allowPlaintext: false,
    });
    expect(opened.plain).toBe("x-refresh");
    expect(opened.rotated).toBe(true);
  });

  it("does not mark rotation when the primary key works", () => {
    const packed = encryptSecret("x-refresh", KEY_A);
    const opened = decryptSecretWithKeys(packed, [KEY_A, KEY_B], {
      allowPlaintext: false,
    });
    expect(opened.rotated).toBe(false);
  });
});
