export interface CredentialSubject {
  id: string;
  given_name: string;
  family_name: string;
  email: string;
  enrollment_status: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
  statusListIndex: string;
  statusListCredential: string;
}

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  fieldSignatures: Record<string, string>;
}

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: CredentialSubject;
  credentialStatus: CredentialStatus;
  proof: CredentialProof;
}

export const ProofType = {
  StudentStatus: "student_status",
} as const;

export type ProofType = (typeof ProofType)[keyof typeof ProofType];

export interface Groth16ProofData {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface Groth16Proof {
  proof: Groth16ProofData;
  publicSignals: string[];
}
