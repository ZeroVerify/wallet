declare module "snarkjs" {
  interface MemFile {
    type: "mem";
    data: Uint8Array;
  }

  interface Groth16ProofResult {
    proof: {
      pi_a: string[];
      pi_b: string[][];
      pi_c: string[];
      protocol: string;
      curve: string;
    };
    publicSignals: string[];
  }

  export const groth16: {
    fullProve(
      input: Record<string, string>,
      wasmFile: string | MemFile,
      zkeyFileName: string | MemFile,
      logger?: unknown,
    ): Promise<Groth16ProofResult>;
  };
}
