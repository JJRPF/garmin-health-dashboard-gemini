"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { ChevronLeft, Save, Sparkles, Brain, User, Activity, RefreshCw, ShieldCheck, AlertTriangle, ExternalLink, Terminal, Globe, Key } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const { t } = useLang();
  
  const [aiProvider, setAiProvider] = useState<"anthropic" | "gemini">("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [garminUsername, setGarminUsername] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [garminOAuth1, setGarminOAuth1] = useState("");
  const [garminOAuth2, setGarminOAuth2] = useState("");
  
  const [message, setMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");

  useEffect(() => {
    const savedProvider = localStorage.getItem("aiProvider") as "anthropic" | "gemini" | null;
    const savedAnthropicKey = localStorage.getItem("anthropicKey") || "";
    const savedGoogleKey = localStorage.getItem("googleKey") || "";
    const savedGarminUsername = localStorage.getItem("garminUsername") || "";
    const savedGarminPassword = localStorage.getItem("garminPassword") || "";
    const savedGarminOAuth1 = localStorage.getItem("garminOAuth1") || "";
    const savedGarminOAuth2 = localStorage.getItem("garminOAuth2") || "";

    if (savedProvider) setAiProvider(savedProvider);
    setAnthropicKey(savedAnthropicKey);
    setGoogleKey(savedGoogleKey);
    setGarminUsername(savedGarminUsername);
    setGarminPassword(savedGarminPassword);
    setGarminOAuth1(savedGarminOAuth1);
    setGarminOAuth2(savedGarminOAuth2);
    setIsHydrated(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem("aiProvider", aiProvider);
    localStorage.setItem("anthropicKey", anthropicKey);
    localStorage.setItem("googleKey", googleKey);
    localStorage.setItem("garminUsername", garminUsername);
    localStorage.setItem("garminPassword", garminPassword);
    localStorage.setItem("garminOAuth1", garminOAuth1);
    localStorage.setItem("garminOAuth2", garminOAuth2);
    setMessage("Settings Saved Locally ✓");
    setTimeout(() => setMessage(""), 3000);
  };

  const exchangeTicket = async () => {
    if (!ticketUrl) return;
    setIsProcessing(true);
    setMessage("");

    try {
      // Robust ticket extraction
      const ticketMatch = ticketUrl.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
      const ticket = ticketMatch ? ticketMatch[1] : (ticketUrl.startsWith('ST-') ? ticketUrl : null);

      if (!ticket) {
        setMessage("❌ URL invalid. Make sure it contains 'ticket=ST-...'");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/auth/garmin", {
        method: "POST",
        body: JSON.stringify({ action: "exchange", ticket }),
      });

      const data = await res.json();
      if (data.status === "success") {
        const o1 = JSON.stringify(data.tokens.oauth1);
        const o2 = JSON.stringify(data.tokens.oauth2);
        setGarminOAuth1(o1);
        setGarminOAuth2(o2);
        localStorage.setItem("garminOAuth1", o1);
        localStorage.setItem("garminOAuth2", o2);
        setTicketUrl("");
        setMessage("✅ Connection successful! Tokens updated.");
      } else {
        setMessage("❌ Exchange failed: " + (data.error || "Invalid ticket"));
      }
    } catch (e) {
      setMessage("❌ Connection error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isHydrated) return null;

  // This URL forces a fresh login to ensure a valid ticket is generated
  const forceLoginUrl = "https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&reauth=true";

  return (
    <div className="min-h-screen bg-bg pb-28 text-white">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-sm font-bold text-primary">Device & AI Settings</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-6">
        
        {/* Connection Wizard */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Garmin Connection (403 Bypass)</h2>
            <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-0.5 rounded-full font-bold">RELIABLE</span>
          </div>
          
          <div className="card border-blue-500/30 bg-blue-500/5 overflow-hidden">
            <div className="p-4 space-y-5">
              <div>
                <p className="text-[11px] text-secondary mb-3 leading-relaxed">
                  1. Click the button below to log in on the official Garmin site.
                </p>
                <a 
                  href={forceLoginUrl}
                  target="_blank"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-center font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  Log in on Garmin.com
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <p className="text-[11px] text-secondary leading-relaxed">
                  2. After login, you'll see a blank page. <b>Copy the URL</b> from your browser's address bar and paste it here:
                </p>
                <input
                  type="text"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  placeholder="https://connect.garmin.com/modern/?ticket=ST-..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-[10px] focus:outline-none focus:border-blue-500 text-white font-mono"
                />
                <button
                  onClick={exchangeTicket}
                  disabled={!ticketUrl || isProcessing}
                  className="w-full py-3.5 bg-white text-black font-black rounded-xl text-[11px] uppercase tracking-wider shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isProcessing ? "Validating..." : "Connect My Account"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Backup */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] px-1">Cloud Credentials (Optional)</h2>
          <div className="card">
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={garminUsername}
                onChange={(e) => setGarminUsername(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-white"
                placeholder="Email (used for summary only)"
              />
              <p className="text-[9px] text-muted px-1">Note: Passwords are no longer needed if using the bypass method above.</p>
            </div>
          </div>
        </section>

        {/* AI Configuration */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] px-1">AI Intelligence</h2>
          <div className="card">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setAiProvider("anthropic")} className={`py-3 rounded-xl border text-xs font-bold transition-all ${aiProvider === "anthropic" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"}`}>Anthropic</button>
              <button onClick={() => setAiProvider("gemini")} className={`py-3 rounded-xl border text-xs font-bold transition-all ${aiProvider === "gemini" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"}`}>Gemini</button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Brain size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-xs" placeholder="Anthropic API Key" />
              </div>
              <div className="relative">
                <Sparkles size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input type="password" value={googleKey} onChange={e => setGoogleKey(e.target.value)} className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-xs" placeholder="Google Gemini Key" />
              </div>
            </div>
          </div>
        </section>

        <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Save size={18} /> Update Local Settings
        </button>

        {message && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-surface border border-border text-white text-[10px] font-bold px-6 py-3 rounded-full shadow-2xl animate-fade-up z-50 whitespace-nowrap">
            {message}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
