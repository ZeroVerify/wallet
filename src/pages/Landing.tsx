import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Shield, Zap, RefreshCw } from "lucide-react";
import logoImage from "../imports/LOGO.png";
import oaklandLogo from "../imports/Oakland Logo.png";

export function Landing() {
  const navigate = useNavigate();

  const partners = [
    {
      name: "Oakland University",
      alt: "Oakland University logo",
      src: oaklandLogo,
    },
    {
      name: "Spotify",
      alt: "Spotify logo",
      src: "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png",
    },
    {
      name: "Adobe",
      alt: "Adobe logo",
      src: "https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg",
    },
    {
      name: "Amazon",
      alt: "Amazon logo",
      src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    },
    {
      name: "Starbucks",
      alt: "Starbucks logo",
      src: "https://upload.wikimedia.org/wikipedia/en/d/d3/Starbucks_Corporation_Logo_2011.svg",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="flex justify-center mb-8">
          <img src={logoImage} alt="ZeroVerify" className="h-[640px]" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Verify student status without exposing personal data
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Users authenticate with their university, then share a yes/no proof.
          No name, no date of birth, no student ID shared—just verified status.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/wallet")}
            className="zeroverify-gradient hover:opacity-90 text-white"
          >
            Open Wallet
          </Button>
        </div>
      </div>

      {/* Partners Section */}
      <div className="border-t border-b border-gray-200 bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-8">
          <p className="text-center text-sm text-gray-500 mb-8">
            Potential partners and organizations we're built for
          </p>
          <div className="grid grid-cols-5 gap-8 items-center">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="flex items-center justify-center h-16 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
              >
                <img
                  src={partner.src}
                  alt={partner.alt}
                  className="max-h-12 max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="grid grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <Shield className="size-6 text-cyan-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Privacy-first
            </h3>
            <p className="text-sm text-gray-600">
              Only share yes/no verification—no personal information leaves your
              control.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <Zap className="size-6 text-cyan-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fast verification
            </h3>
            <p className="text-sm text-gray-600">
              Complete the entire verification process in seconds, not minutes.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <RefreshCw className="size-6 text-cyan-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Replay-protected
            </h3>
            <p className="text-sm text-gray-600">
              Each proof includes a unique challenge to prevent reuse or fraud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
