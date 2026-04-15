import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { issueCredential } from "@lib/api/issuance";
import { useWallet } from "../context/useWallet";
import { storeCredential } from "@lib/credential-store";
import { PassphraseGate } from "../components/PassphraseGate";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { AlertCircle, LoaderCircle } from "lucide-react";

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
              () => navigate("/wallet", { state: { issued: true } }),
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
      <div className="min-h-[calc(100vh-145px)] bg-white">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <div className="flex justify-center">
            <Card className="w-full max-w-md p-8 shadow-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-red-50 mb-4">
                  <AlertCircle className="size-8 text-red-500" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h1>

                <p className="text-gray-600 mb-6">{error}</p>

                <Button
                  onClick={() => navigate("/")}
                  className="w-full zeroverify-gradient hover:opacity-90 text-white"
                >
                  Go back
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!key) {
    return <PassphraseGate />;
  }

  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8 shadow-sm">
            <div className="text-center">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-gray-100 mb-4">
                <LoaderCircle className="size-8 text-gray-500 animate-spin" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Completing sign-in
              </h1>

              <p className="text-gray-600">
                Please wait while we issue and store your credential.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
