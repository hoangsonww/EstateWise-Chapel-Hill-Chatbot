/**
 * Passkey ceremony helpers — bridge between our REST API (lib/api.ts) and the
 * @simplewebauthn/browser SDK. Each function performs a complete WebAuthn
 * ceremony: fetch options → call the platform → POST verification.
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import {
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
  PASSKEYS_ENABLED,
} from "./api";

export {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  PASSKEYS_ENABLED,
};

/**
 * Whether to render passkey UI in this browser. False on:
 *   - SSR (no window/credentials API)
 *   - Browsers without WebAuthn
 *   - When NEXT_PUBLIC_PASSKEYS_ENABLED=false
 */
export function passkeysAvailable(): boolean {
  if (!PASSKEYS_ENABLED) return false;
  if (typeof window === "undefined") return false;
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
}

/**
 * Add a new passkey to the currently-logged-in account.
 * Returns the new credential summary on success.
 */
export async function registerPasskey(token: string, nickname?: string) {
  const options = await getRegistrationOptions(token);
  const attResp = await startRegistration({ optionsJSON: options });
  return verifyRegistration(token, attResp, nickname);
}

/**
 * Sign in with a passkey.
 *
 * - If `email` is supplied, options are scoped to that account.
 * - If omitted, runs the discoverable-credential flow ("Sign in with a passkey")
 *   where the browser shows the user a chooser of available passkeys.
 *
 * `useBrowserAutofill` enables conditional UI on the email <input> — the
 * password manager surfaces the passkey inline. Call once on page mount with
 * `useBrowserAutofill: true` and let it resolve when the user picks one.
 */
export async function signInWithPasskey(opts?: {
  email?: string;
  useBrowserAutofill?: boolean;
}) {
  const { email, useBrowserAutofill } = opts || {};
  const options = await getAuthenticationOptions(email);
  const sessionId: string | undefined = options.sessionId;

  const assertion = await startAuthentication({
    optionsJSON: options,
    useBrowserAutofill: !!useBrowserAutofill,
  });

  return verifyAuthentication({
    response: assertion,
    email: email || undefined,
    sessionId,
  });
}
