import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseVerificationRequest,
  generateProof,
  submitProofToVerifier,
} from "@lib/proof";
import { PassphraseGate } from "../components/PassphraseGate";
import { useWallet } from "../context/useWallet";

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
      <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
        <h2>Invalid Request</h2>
        <p>This verification link is missing required parameters.</p>
        <button onClick={() => navigate("/")}>Go to Wallet</button>
      </div>
    );
  }

  if (declined) {
    return (
      <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
        <h2>Request Declined</h2>
        <p>You declined the verification request. No data was shared.</p>
        <button onClick={() => navigate("/")}>Go to Wallet</button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
        <h2>Verification Accepted</h2>
        <p>Your proof was successfully verified by {request.verifier_id}.</p>
        <button onClick={() => navigate("/")}>Go to Wallet</button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
        <h2>Verification Failed</h2>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/")}>Go to Wallet</button>
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
    <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h2>Verification Request</h2>
      <p>
        <strong>{request.verifier_id}</strong> is requesting proof of your
        student status.
      </p>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <p>
          <strong>Proof type:</strong> {request.proof_type}
        </p>
        <p>
          <strong>Requested by:</strong> {request.verifier_id}
        </p>
      </div>
      <p style={{ fontSize: "0.9rem", color: "#555" }}>
        Approving will generate a zero-knowledge proof. No personal data will be
        shared — only proof that you meet the requirement.
      </p>
      {stage === "generating" && <p>Generating proof…</p>}
      {stage === "submitting" && <p>Submitting proof…</p>}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button onClick={() => setDeclined(true)} disabled={stage !== null}>
          Decline
        </button>
        <button onClick={handleApprove} disabled={stage !== null}>
          {stage === "generating"
            ? "Generating…"
            : stage === "submitting"
              ? "Submitting…"
              : "Approve"}
        </button>
      </div>
    </div>
  );
}
