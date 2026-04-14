import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Mail, MessageSquare, Send } from "lucide-react";

export function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to an API
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-[calc(100vh-145px)] bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions about ZeroVerify? We'd love to hear from you. Send us
            a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center border border-gray-200">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <Mail className="size-6 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
            <p className="text-sm text-gray-600">support@zeroverify.com</p>
          </Card>

          <Card className="p-6 text-center border border-gray-200">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <MessageSquare className="size-6 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
            <p className="text-sm text-gray-600">
              Available Mon-Fri, 9am-5pm EST
            </p>
          </Card>

          <Card className="p-6 text-center border border-gray-200">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
              <Send className="size-6 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
            <p className="text-sm text-gray-600">Typically within 24 hours</p>
          </Card>
        </div>

        <Card className="p-8 border border-gray-200">
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-linear-to-br from-cyan-100 to-purple-100 mb-4">
                <Send className="size-8 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Message Sent!
              </h2>
              <p className="text-base text-gray-600">
                Thank you for contacting us. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="What is this regarding?"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Tell us more..."
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full zeroverify-gradient hover:opacity-90 text-white"
                size="lg"
              >
                Send Message
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
