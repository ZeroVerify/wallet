import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { issueCredential } from "@lib/api/issuance";
import { useWallet } from "../context/useWallet";
import { storeCredential } from "@lib/credential-store";
import { PassphraseGate } from "../components/PassphraseGate";

function getErrorMessage(status: number | undefined): string {
  switch (status) {
    case 401:
      return "Your session expired or is invalid. Please try again.";
    case 409:
      return "You already have an active credential. Revoke it before issuing a new one.";
    case 503:
      return "Issuance service is temporarily unavailable. Try again in a few minutes.";
    default:
      return status
        ? `Issuance failed (${status}). Please try again.`
        : "Network error. Check your connection and try again.";
  }
}

export function Callback() {
  const navigate = useNavigate();
  const { key } = useWallet();
  const [error, setError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      return "Authentication was cancelled or failed. Please try again.";
    }

    const state = params.get("state");
    const savedState = sessionStorage.getItem("oauth_state");
    if (!state || state !== savedState) {
      return "Invalid session state. Please try again.";
    }

    const code = params.get("code");
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (!code || !verifier) {
      return "Missing authorization code. Please try again.";
    }

    return null;
  });

  useEffect(() => {
    if (error || !key) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const verifier = sessionStorage.getItem("pkce_verifier");

    if (!code || !verifier) return;

    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("pkce_verifier");

    let cancelled = false;

    issueCredential(code, verifier).then((result) => {
      if (cancelled) return;
      result.match(
        (credential) => {
          storeCredential(credential, key).then((storeResult) => {
            if (cancelled) return;
            storeResult.match(
              () => navigate("/"),
              (storeErr) =>
                setError(`Failed to store credential: ${storeErr.message}`),
            );
          });
        },
        (err) => setError(getErrorMessage(err.status)),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, error, key]);

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go back</button>
      </div>
    );
  }

  if (!key) {
    return <PassphraseGate />;
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Completing sign-in…</p>
    </div>
  );
}
