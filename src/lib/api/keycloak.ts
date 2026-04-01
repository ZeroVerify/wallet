import {
  KEYCLOAK_BASE,
  KEYCLOAK_REALM,
  CLIENT_ID,
  REDIRECT_URI,
} from "@lib/api/config";

export interface IdP {
  id: string;
  displayName: string;
}

export const SUPPORTED_IDPS: IdP[] = [
  { id: "mock-idp", displayName: "Oakland University" },
];

interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

async function generatePKCE(): Promise<PKCEPair> {
  const array = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { codeVerifier, codeChallenge };
}

export interface AuthRequest {
  url: string;
  codeVerifier: string;
}

export async function createAuthRequest(idp: IdP): Promise<AuthRequest> {
  const { codeVerifier, codeChallenge } = await generatePKCE();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "openid",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    kc_idp_hint: idp.id,
  });

  const url = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${params}`;
  return { url, codeVerifier };
}
