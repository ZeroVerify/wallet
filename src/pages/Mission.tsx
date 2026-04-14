import { Shield, Lock, Users, Globe } from "lucide-react";

export function Mission() {
  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Mission</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Empowering students to control their personal data while enabling
            seamless verification for universities and service providers.
          </p>
        </div>

        <div className="space-y-12">
          <div className="flex gap-6">
            <div className="shrink-0">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100">
                <Shield className="size-6 text-cyan-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Privacy-First Verification
              </h2>
              <p className="text-base text-gray-600">
                We believe students should have complete control over their
                personal information. ZeroVerify enables verification without
                exposing sensitive data like names, student IDs, or dates of
                birth. Only the answer to the verification question is
                shared—nothing more.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="shrink-0">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100">
                <Lock className="size-6 text-cyan-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Cryptographically Secure
              </h2>
              <p className="text-base text-gray-600">
                Built on zero-knowledge proof technology, ZeroVerify ensures
                that verification is tamper-proof and replay-protected. Each
                proof is unique and tied to a specific verification request,
                preventing fraud and unauthorized reuse.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="shrink-0">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100">
                <Users className="size-6 text-cyan-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Built for Students
              </h2>
              <p className="text-base text-gray-600">
                Students deserve better than sharing their entire identity for a
                simple discount or service access. ZeroVerify puts students in
                control, making verification fast, secure, and private—the way
                it should be.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="shrink-0">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100">
                <Globe className="size-6 text-cyan-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Open and Accessible
              </h2>
              <p className="text-base text-gray-600">
                We're committed to making privacy-preserving verification
                accessible to all students, regardless of their university or
                location. Our platform integrates with existing university
                authentication systems to provide seamless, universal access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
