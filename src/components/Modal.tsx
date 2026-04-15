import { Card } from "./ui/card";

interface ModalProps {
  children: React.ReactNode;
}

export function Modal({ children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md p-8 shadow-xl mx-4">{children}</Card>
    </div>
  );
}
