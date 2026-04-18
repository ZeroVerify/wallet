import { useState } from "react";
import { deriveKey } from "@lib/crypto";
import { getOrCreateSalt } from "@lib/credential-store";
import { useWallet } from "../context/useWallet";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { LockKeyhole } from "lucide-react";

export function PassphraseGate() {
  const { unlock } = useWallet();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!passphrase) return;
    setLoading(true);
    setError(null);

    const result = await getOrCreateSalt().andThen((salt) =>
      deriveKey(passphrase, salt),
    );

    result.match(
      (key) => unlock(key),
      () => setError("Failed to unlock wallet. Please try again."),
    );

    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-gray-100 mb-4">
                <LockKeyhole className="size-8 text-gray-500" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Unlock Wallet
              </h1>

              <p className="text-gray-600">
                Enter your passphrase to continue.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Passphrase"
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !passphrase}
                className="w-full zeroverify-gradient hover:opacity-90 text-white"
              >
                {loading ? "Unlocking…" : "Unlock"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
