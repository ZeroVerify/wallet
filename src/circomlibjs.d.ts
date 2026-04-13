declare module "circomlibjs" {
  interface FieldMath {
    toObject(x: unknown): bigint;
    e(x: bigint): unknown;
  }

  interface Eddsa {
    F: FieldMath;
    babyJub: {
      unpackPoint(buf: Uint8Array): [unknown, unknown];
    };
    unpackSignature(buf: Uint8Array): { R8: [unknown, unknown]; S: bigint };
    signPoseidon(
      privKey: Uint8Array,
      msg: unknown,
    ): { R8: [unknown, unknown]; S: bigint };
    prv2pub(privKey: Uint8Array): [unknown, unknown];
  }

  export function buildEddsa(): Promise<Eddsa>;
}
