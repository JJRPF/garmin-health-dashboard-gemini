"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { ChevronLeft, Save, Sparkles, Brain, User, Activity, RefreshCw, ShieldCheck, AlertTriangle, ExternalLink, Terminal } from "lucide-react";
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

  // Hydration safety: read from localStorage on mount
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

  const startGarminLogin = async () => {
    if (!garminUsername || !garminPassword) {
      setMessage("Enter email and password first");
      return;
    }

    setIsProcessing(true);
    setAuthStatus("idle");
    setMessage("");
    
    try {
      const res = await fetch("/api/auth/garmin", {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          username: garminUsername,
          password: garminPassword,
        }),
      });

      const data = await res.json();

      if (data.status === "mfa_required") {
        setAuthStatus("mfa_required");
        setAuthState(data.state);
        setMessage("Verification code sent to your email");
      } else if (data.status === "success") {
        saveTokens(data.tokens);
      } else {
        setAuthStatus("error");
        setMessage(data.error || "Login failed");
      }
    } catch (e) {
      setAuthStatus("error");
      setMessage("Connection error (likely blocked by Garmin)");
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyMfaCode = async () => {
    if (!mfaCode) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/auth/garmin", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          username: garminUsername,
          password: garminPassword,
          mfaCode,
          state: authState,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        saveTokens(data.tokens);
      } else {
        setAuthStatus("mfa_required");
        setMessage(data.error || "Invalid code");
      }
    } catch (e) {
      setAuthStatus("error");
      setMessage("Verification failed");
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
    setAuthStatus("success");
    setMessage("✅ Connected successfully!");
    setMfaCode("");
    setAuthState(null);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-muted">{t("common.loading")}</div>
      </div>
    );
  }

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
        
        {/* Garmin Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1">Garmin Authentication</h2>
          <div className="card">
            <div className="card-header mb-4">
              <User size={14} className="text-primary" />
              <span>{t("settings.garminSection")}</span>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                  {t("settings.garminUsername")}
                </label>
                <input
                  type="email"
                  value={garminUsername}
                  onChange={(e) => setGarminUsername(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-white"
                  placeholder="your@email.com"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                  {t("settings.garminPassword")}
                </label>
                <input
                  type="password"
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-white"
                  placeholder="••••••••"
                  disabled={isProcessing}
                />
              </div>

              {authStatus === "mfa_required" ? (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 animate-fade-up">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">MFA Required</span>
                  </div>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-bg border border-primary/30 rounded-xl px-4 py-3 text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:border-primary transition-colors text-white mb-3"
                    placeholder="000000"
                    autoFocus
                  />
                  <button
                    onClick={verifyMfaCode}
                    disabled={isProcessing || mfaCode.length < 6}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : null}
                    Verify & Connect
                  </button>
                  <button 
                    onClick={() => setAuthStatus("idle")}
                    className="w-full mt-2 py-2 text-[10px] text-muted hover:text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={startGarminLogin}
                  disabled={isProcessing || !garminUsername || !garminPassword}
                  className="mt-2 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{isProcessing ? "Connecting..." : "Sign in to Garmin"}</span>
                </button>
              )}

              <div className="pt-4 border-t border-border mt-2">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">
                    Advanced / Manual Tokens
                  </label>
                  <button 
                    onClick={() => setAuthStatus(authStatus === "idle" ? "success" : "idle")} 
                    className="text-[9px] text-muted hover:text-secondary underline"
                  >
                    {garminOAuth1 ? "Show Tokens" : "Paste Manually"}
                  </button>
                </div>
                
                {(garminOAuth1 || authStatus === "success") && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                        {t("settings.garminOAuth1")}
                      </label>
                      <textarea
                        value={garminOAuth1}
                        onChange={(e) => setGarminOAuth1(e.target.value)}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-[10px] font-mono h-20 focus:outline-none focus:border-primary transition-colors text-white resize-none"
                        placeholder='{"oauth_token":"...","oauth_token_secret":"..."}'
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                        {t("settings.garminOAuth2")}
                      </label>
                      <textarea
                        value={garminOAuth2}
                        onChange={(e) => setGarminOAuth2(e.target.value)}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-[10px] font-mono h-20 focus:outline-none focus:border-primary transition-colors text-white resize-none"
                        placeholder='{"access_token":"...","refresh_token":"..."}'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
            <AlertTriangle size={12} className="text-yellow-500" />
            Troubleshooting
          </h2>
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex flex-col gap-4 text-xs leading-relaxed text-secondary">
              <p className="font-semibold text-yellow-500/90">
                Getting a 403 Forbidden error?
              </p>
              <p>
                Garmin often blocks Vercel servers. If the "Sign In" button above fails, use the local terminal method:
              </p>
              
              <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-muted" />
                  <code className="text-[10px] text-primary">node scripts/get-garmin-tokens.js</code>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText("node scripts/get-garmin-tokens.js")}
                  className="text-[10px] hover:text-white underline"
                >
                  Copy
                </button>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase tracking-wider text-muted">Steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Run the command above in your computer's terminal.</li>
                  <li>Follow the prompts to log in and enter your MFA code.</li>
                  <li>Copy the resulting JSON strings and paste them into the <b>Manual Tokens</b> fields above.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* AI Provider Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest px-1">AI Intelligence</h2>
          <div className="card">
            <div className="card-header mb-4">
              <Sparkles size={14} className="text-primary" />
              <span>{t("settings.aiProvider")}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => setAiProvider("anthropic")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  aiProvider === "anthropic" 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-surface border-border text-muted hover:text-secondary"
                }`}
              >
                <Brain size={16} />
                <span className="text-xs font-semibold">Anthropic</span>
              </button>
              <button
                onClick={() => setAiProvider("gemini")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  aiProvider === "gemini" 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-surface border-border text-muted hover:text-secondary"
                }`}
              >
                <Sparkles size={16} />
                <span className="text-xs font-semibold">Gemini</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                  {t("settings.anthropicKey")}
                </label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={t("settings.placeholders.anthropic")}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                  {t("settings.googleKey")}
                </label>
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder={t("settings.placeholders.google")}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-white"
                />
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <Save size={18} />
          <span>{t("settings.save")}</span>
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
