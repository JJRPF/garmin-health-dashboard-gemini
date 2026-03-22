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

  // Auth flow state
  const [authStatus, setAuthStatus] = useState<"idle" | "mfa_required" | "success" | "error">("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [authState, setAuthState] = useState<any>(null);
  const [ticketUrl, setTicketUrl] = useState("");

  // Hydration safety
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
    setMessage(t("settings.success"));
    setTimeout(() => setMessage(""), 3000);
  };

  const exchangeTicket = async () => {
    if (!ticketUrl) return;
    setIsProcessing(true);
    setMessage("");

    try {
      // Extract ST-XXX from the URL
      const match = ticketUrl.match(/ticket=(ST-[A-Za-z0-9-]+-cas)/);
      const ticket = match ? match[1] : ticketUrl;

      const res = await fetch("/api/auth/garmin", {
        method: "POST",
        body: JSON.stringify({ action: "exchange", ticket }),
      });

      const data = await res.json();
      if (data.status === "success") {
        saveTokens(data.tokens);
        setTicketUrl("");
      } else {
        setMessage(data.error || "Exchange failed");
      }
    } catch (e) {
      setMessage("Connection error during exchange");
    } finally {
      setIsProcessing(false);
    }
  };

  const startGarminLogin = async () => {
    setIsProcessing(true);
    setAuthStatus("idle");
    setMessage("");
    try {
      const res = await fetch("/api/auth/garmin", {
        method: "POST",
        body: JSON.stringify({ action: "login", username: garminUsername, password: garminPassword }),
      });
      const data = await res.json();
      if (data.status === "mfa_required") {
        setAuthStatus("mfa_required");
        setAuthState(data.state);
      } else if (data.status === "success") {
        saveTokens(data.tokens);
      } else {
        setMessage(data.error || "Login failed");
      }
    } catch (e) {
      setMessage("Blocked by Garmin (403). Use the Mobile Bypass below.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTokens = (tokens: any) => {
    const o1 = JSON.stringify(tokens.oauth1);
    const o2 = JSON.stringify(tokens.oauth2);
    setGarminOAuth1(o1);
    setGarminOAuth2(o2);
    localStorage.setItem("garminOAuth1", o1);
    localStorage.setItem("garminOAuth2", o2);
    setMessage("✅ Connected successfully!");
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-bg pb-28 text-white">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-sm font-bold text-primary">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-6">
        
        {/* Bypass Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <Globe size={12} />
            Mobile Login (Bypass 403)
          </h2>
          <div className="card border-blue-500/30 bg-blue-500/5">
            <div className="flex flex-col gap-4 text-xs">
              <p className="text-secondary leading-relaxed">
                If the standard "Sign In" fails, use this method to log in via your phone's IP address.
              </p>
              
              <a 
                href="https://sso.garmin.com/sso/signin?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&clientId=GarminConnect&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true"
                target="_blank"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-center font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                1. Log in on Garmin.com
                <ExternalLink size={14} />
              </a>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted ml-1">2. Paste result URL or Ticket</p>
                <input
                  type="text"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  placeholder="https://connect.garmin.com/modern/?ticket=ST-..."
                  className="w-full bg-black/50 border border-blue-500/30 rounded-xl px-4 py-3 text-[10px] focus:outline-none focus:border-blue-500 text-white"
                />
                <button
                  onClick={exchangeTicket}
                  disabled={!ticketUrl || isProcessing}
                  className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "3. Extract & Save Tokens"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Garmin Standard Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1">Standard Sign In</h2>
          <div className="card">
            <div className="flex flex-col gap-4">
              <input
                type="email"
                value={garminUsername}
                onChange={(e) => setGarminUsername(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-white"
                placeholder="Garmin Email"
              />
              <input
                type="password"
                value={garminPassword}
                onChange={(e) => setGarminPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-white"
                placeholder="Garmin Password"
              />
              <button
                onClick={startGarminLogin}
                disabled={isProcessing || !garminUsername}
                className="py-3 bg-surface border border-border rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all"
              >
                Sign in to Garmin
              </button>
            </div>
          </div>
        </section>

        {/* Tokens Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1">Active Tokens</h2>
          <div className="card">
            <div className="flex flex-col gap-4">
              <textarea
                value={garminOAuth1}
                readOnly
                className="w-full bg-black/30 border border-border rounded-xl px-4 py-3 text-[9px] font-mono h-16 resize-none opacity-60"
                placeholder="GARMIN_OAUTH1 (Auto-filled)"
              />
              <textarea
                value={garminOAuth2}
                readOnly
                className="w-full bg-black/30 border border-border rounded-xl px-4 py-3 text-[9px] font-mono h-16 resize-none opacity-60"
                placeholder="GARMIN_OAUTH2 (Auto-filled)"
              />
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1">AI Provider</h2>
          <div className="card">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setAiProvider("anthropic")} className={`py-3 rounded-xl border text-xs font-bold ${aiProvider === "anthropic" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"}`}>Anthropic</button>
              <button onClick={() => setAiProvider("gemini")} className={`py-3 rounded-xl border text-xs font-bold ${aiProvider === "gemini" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"}`}>Gemini</button>
            </div>
            <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs mb-3" placeholder="Anthropic Key" />
            <input type="password" value={googleKey} onChange={e => setGoogleKey(e.target.value)} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs" placeholder="Google Key" />
          </div>
        </section>

        <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Save size={18} /> Save Settings
        </button>

        {message && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-surface border border-border text-white text-[10px] font-bold px-6 py-3 rounded-full shadow-2xl animate-fade-up z-50">
            {message}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
