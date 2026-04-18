import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseVerificationRequest,
  generateProof,
  submitProofToVerifier,
} from "@lib/proof";
import { PassphraseGate } from "../components/PassphraseGate";
import { useWallet } from "../context/useWallet";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { CheckCircle, XCircle, AlertCircle, LoaderCircle } from "lucide-react";

type Stage = "generating" | "submitting" | null;

export function Prove() {
  const navigate = useNavigate();
  const { key } = useWallet();
  const [stage, setStage] = useState<Stage>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const request = parseVerificationRequest(window.location.search);

  if (!key) {
    return <PassphraseGate />;
  }

  if (!request) {
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
                  Invalid Request
                </h1>
                <p className="text-gray-600 mb-6">
                  This verification link is missing required parameters.
                </p>
                <Button
                  onClick={() => navigate("/wallet")}
                  className="w-full zeroverify-gradient hover:opacity-90 text-white"
                >
                  Go to Wallet
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-[calc(100vh-145px)] bg-white">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <div className="flex justify-center">
            <Card className="w-full max-w-md p-8 shadow-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-gray-100 mb-4">
                  <XCircle className="size-8 text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Request Declined
                </h1>
                <p className="text-gray-600 mb-6">
                  You declined the verification request. No data was shared.
                </p>
                <Button
                  onClick={() => navigate("/wallet")}
                  className="w-full zeroverify-gradient hover:opacity-90 text-white"
                >
                  Go to Wallet
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[calc(100vh-145px)] bg-white">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <div className="flex justify-center">
            <Card className="w-full max-w-md p-8 shadow-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-50 mb-4">
                  <CheckCircle className="size-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Verification Accepted
                </h1>
                <p className="text-gray-600 mb-6">
                  Your proof was successfully verified by {request.verifier_id}.
                </p>
                <Button
                  onClick={() => navigate("/wallet")}
                  className="w-full zeroverify-gradient hover:opacity-90 text-white"
                >
                  Go to Wallet
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                  Verification Failed
                </h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button
                  onClick={() => navigate("/wallet")}
                  className="w-full zeroverify-gradient hover:opacity-90 text-white"
                >
                  Go to Wallet
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  async function handleApprove() {
    if (!key || !request) return;
    setError(null);

    setStage("generating");
    const proofResult = await generateProof(request, key);
    if (proofResult.isErr()) {
      setError(proofResult.error.message);
      setStage(null);
      return;
    }

    setStage("submitting");
    const submitResult = await submitProofToVerifier(
      proofResult.value,
      request.callback,
    );
    submitResult.match(
      () => setDone(true),
      (err) => setError(err.message),
    );
    setStage(null);
  }

  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex justify-center">
          <Card className="w-full max-w-md p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Request
            </h1>
            <p className="text-gray-600 mb-6">
              <strong>{request.verifier_id}</strong> is requesting proof of your
              student status.
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6 space-y-1 text-sm text-gray-700">
              <p>
                <span className="font-medium">Proof type:</span>{" "}
                {request.proof_type}
              </p>
              <p>
                <span className="font-medium">Requested by:</span>{" "}
                {request.verifier_id}
              </p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Approving will generate a zero-knowledge proof. No personal data
              will be shared — only proof that you meet the requirement.
            </p>

            {stage && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <LoaderCircle className="size-4 animate-spin" />
                {stage === "generating"
                  ? "Generating proof…"
                  : "Submitting proof…"}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeclined(true)}
                disabled={stage !== null}
              >
                Decline
              </Button>
              <Button
                className="flex-1 zeroverify-gradient hover:opacity-90 text-white"
                onClick={handleApprove}
                disabled={stage !== null}
              >
                {stage === "generating"
                  ? "Generating…"
                  : stage === "submitting"
                    ? "Submitting…"
                    : "Approve"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
