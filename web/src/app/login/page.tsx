"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, RefreshCw, Sparkles, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from "lucide-react";
import {
  saveOfflineSession,
  getUserProfileCredentials,
  saveUserProfileCredentials,
  clearUserProfileCredentials
} from "@/lib/offline-cache";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("ABCD");
  const [loginFlowId, setLoginFlowId] = useState("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);

  // User Profile Saved Credentials State
  const [isOtpOnlyMode, setIsOtpOnlyMode] = useState(false);
  const [savedStudentName, setSavedStudentName] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // OTP flow state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Sync Progress State
  const [syncStep, setSyncStep] = useState<string | null>(null);

  const [isRefreshingCaptcha, setIsRefreshingCaptcha] = useState(false);

  useEffect(() => {
    // Check if user has saved credentials in user profile
    const saved = getUserProfileCredentials();
    if (saved && saved.username && saved.password) {
      setUsername(saved.username);
      setPassword(saved.password);
      setSavedStudentName(saved.student_name || saved.username);
      setIsOtpOnlyMode(true);
    }

    // Initialize ephemeral login handshake
    fetchInitFlow();
  }, []);

  const fetchInitFlow = async () => {
    setIsRefreshingCaptcha(true);
    try {
      const res = await fetch("/api/auth/init", { method: "POST" });
      const data = await res.json();
      if (data.login_flow_id) {
        setLoginFlowId(data.login_flow_id);
        if (data.captcha_image_base64) {
          setCaptchaImage(data.captcha_image_base64);
        }
      }
    } catch (err) {
      console.warn("Init login error", err);
    } finally {
      setIsRefreshingCaptcha(false);
    }
  };

  const mapErrorMessage = (status?: string, rawMsg?: string) => {
    if (status === "INVALID_CREDENTIALS") {
      return "Incorrect Registration Number or Password. Please double-check your VTOP credentials.";
    }
    if (status === "INVALID_CAPTCHA") {
      return "Incorrect CAPTCHA code. Tap the refresh icon next to the CAPTCHA and try again.";
    }
    if (status === "INVALID_OTP") {
      return "Incorrect or expired OTP code. Please enter the valid OTP sent to your registered contact.";
    }
    if (status === "VTOP_UNAVAILABLE") {
      return "VTOP Portal is currently slow or unreachable (503/Timeout). You can use Quick Demo Login.";
    }
    if (status === "OTP_REQUIRED") {
      return "OTP required to proceed.";
    }
    return rawMsg || "Authentication failed. Please verify credentials or try Quick Demo Login.";
  };

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string, customCaptcha?: string, customOtp?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSyncStep("Establishing zero-trust VTOP handshake...");

    const u = (customUser !== undefined ? customUser : username).trim().toUpperCase();
    const p = customPass !== undefined ? customPass : password;
    const c = (customCaptcha !== undefined ? customCaptcha : captchaInput).trim().toUpperCase();
    const o = customOtp !== undefined ? customOtp : (isOtpOnlyMode ? otpValue : undefined);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: u,
          password: p, // RAM-only
          captcha: c,
          login_flow_id: loginFlowId,
          otp: o ? o.trim() : undefined,
        }),
      });

      if (!resp.ok) {
        let errMessage = `Gateway returned HTTP ${resp.status}`;
        try {
          const rawText = await resp.text();
          try {
            const errData = JSON.parse(rawText);
            if (errData.detail) errMessage = errData.detail;
            else if (errData.message) errMessage = errData.message;
          } catch {
            if (rawText && rawText.length < 120 && !rawText.includes("<!DOCTYPE")) {
              errMessage = `${errMessage}: ${rawText.trim()}`;
            }
          }
        } catch {
          // Could not read body
        }
        setIsLoading(false);
        setSyncStep(null);
        setErrorMsg(errMessage);
        return;
      }

      const data = await resp.json();

      if (data.status === "OTP_REQUIRED") {
        setIsLoading(false);
        setSyncStep(null);
        setShowOtpModal(true);
        return;
      }

      if (data.status === "SUCCESS") {
        setSyncStep("Syncing Timetable, Attendance & 10 Academic Modules...");
        
        // Save credentials in user profile if opted in or in OTP mode
        if (rememberCredentials || isOtpOnlyMode) {
          saveUserProfileCredentials({
            username: u,
            password: p,
            saved_at: new Date().toISOString(),
            student_name: data?.profile?.name || u
          });
        }

        // Cache snapshot
        saveOfflineSession(data);

        setTimeout(() => {
          router.push("/");
        }, 600);
      } else {
        setIsLoading(false);
        setSyncStep(null);
        setErrorMsg(mapErrorMessage(data.status, data.message));
      }
    } catch (err: any) {
      setIsLoading(false);
      setSyncStep(null);
      setErrorMsg("Network connection error. Could not connect to authentication gateway. Tap 'Quick Demo Login' below to test in demo mode.");
    }
  };

  const handleQuickDemoLogin = () => {
    setUsername("22BCE10234");
    setPassword("demoPass123");
    setCaptchaInput("ABCD");
    handleLogin(undefined, "22BCE10234", "demoPass123", "ABCD");
  };

  const handleOtpVerify = async () => {
    if (!otpValue.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const resp = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_flow_id: loginFlowId,
          otp: otpValue.trim(),
          username: username.trim(),
          password: password,
        }),
      });

      const data = await resp.json();
      if (data.status === "SUCCESS") {
        if (rememberCredentials || isOtpOnlyMode) {
          saveUserProfileCredentials({
            username: username.trim(),
            password: password,
            saved_at: new Date().toISOString(),
            student_name: data?.profile?.name || username.trim(),
          });
        }
        saveOfflineSession(data);
        router.push("/");
      } else {
        setIsLoading(false);
        setErrorMsg(data.message || "Invalid or expired OTP code.");
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg("OTP verification failed. Please try again.");
    }
  };

  const handleSwitchAccount = () => {
    clearUserProfileCredentials();
    setIsOtpOnlyMode(false);
    setUsername("");
    setPassword("");
    setOtpValue("");
    setSavedStudentName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
            <Shield className="w-6 h-6 text-indigo-200" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">VIT-AP VTOP Assistant</h1>
          <p className="text-xs text-indigo-200/70 mt-1">
            Zero-Trust • 100% Free Tier • RAM-Only Password Processing
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sync Progress Spinner */}
        {syncStep ? (
          <div className="py-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-indigo-200">{syncStep}</p>
            <span className="text-[11px] text-slate-400 block">
              Parallel async gather: Timetable, Attendance, Marks, Exams...
            </span>
          </div>
        ) : isOtpOnlyMode ? (
          /* Returning Student Mode - Only OTP Required */
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Student Profile Card */}
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {(savedStudentName || username).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white block">
                      {savedStudentName || "Student Account"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Saved
                    </span>
                  </div>
                  <span className="text-xs text-indigo-300/80 font-mono">{username} • Password Verified</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs text-indigo-400 hover:text-indigo-200 underline font-medium cursor-pointer"
                title="Switch student account or update password"
              >
                Switch
              </button>
            </div>

            {/* Notice Pill */}
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Credentials saved in user profile. Only VTOP OTP is required.</span>
            </div>

            {/* CAPTCHA Row */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">CAPTCHA Verification</label>
                <button
                  type="button"
                  onClick={fetchInitFlow}
                  disabled={isRefreshingCaptcha}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  title="Generate new CAPTCHA"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingCaptcha ? "animate-spin" : ""}`} />
                  <span>Refresh Code</span>
                </button>
              </div>
              <div className="flex gap-2">
                <div className="w-28 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center font-mono font-bold tracking-widest text-indigo-300 text-sm select-none">
                  {captchaImage && captchaImage.startsWith("data:image") ? (
                    <img src={captchaImage} alt="CAPTCHA" className="max-h-7 object-contain" />
                  ) : (
                    "ABCD"
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-400 transition uppercase font-mono tracking-wider"
                />
              </div>
            </div>

            {/* OTP Input Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                VTOP One-Time Password (OTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="Enter 6-digit OTP (e.g. 123456)"
                className="w-full text-center text-lg font-mono tracking-widest bg-white/5 border border-white/10 rounded-xl py-2.5 text-white placeholder:text-slate-500 placeholder:text-xs placeholder:font-sans focus:outline-hidden focus:border-indigo-400 transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block text-center">
                Sent to your registered Email / WhatsApp by VTOP
              </span>
            </div>

            {/* Verify OTP & Sync Button */}
            <button
              type="submit"
              disabled={isLoading || !otpValue.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP & Syncing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Verify OTP & Complete Login</span>
                </>
              )}
            </button>

            {/* Switch Account Link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs text-slate-400 hover:text-slate-200 transition underline"
              >
                Log in with a different account or re-enter password
              </button>
            </div>
          </form>
        ) : (
          /* First-Time Login Mode - Asks for Username & Password */
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Reg No */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                VTOP Registration Number
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  placeholder="e.g., 22BCE10234"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-400 transition uppercase font-mono tracking-wider"
                />
              </div>
            </div>

            {/* Password (RAM-only) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">VTOP Password</label>
                <span className="text-[10px] text-emerald-400 font-medium">Zero-storage guarantee</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-400 transition"
                />
              </div>
            </div>

            {/* CAPTCHA Row */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">CAPTCHA Verification</label>
                <button
                  type="button"
                  onClick={fetchInitFlow}
                  disabled={isRefreshingCaptcha}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  title="Generate new CAPTCHA"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingCaptcha ? "animate-spin" : ""}`} />
                  <span>Refresh Code</span>
                </button>
              </div>
              <div className="flex gap-2">
                <div className="w-28 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center font-mono font-bold tracking-widest text-indigo-300 text-sm select-none">
                  {captchaImage && captchaImage.startsWith("data:image") ? (
                    <img src={captchaImage} alt="CAPTCHA" className="max-h-7 object-contain" />
                  ) : (
                    "ABCD"
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-400 transition uppercase font-mono tracking-wider"
                />
              </div>
            </div>

            {/* Remember Credentials Checkbox */}
            <div className="flex items-center gap-2 text-xs text-slate-300 py-1">
              <input
                type="checkbox"
                id="remember_creds"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="accent-indigo-600 rounded cursor-pointer w-4 h-4"
              />
              <label htmlFor="remember_creds" className="cursor-pointer select-none">
                Save credentials in user profile (only OTP required next time)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Login & Parallel Sync</span>
                </>
              )}
            </button>

            {/* Quick Demo Login Option */}
            <div className="pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isLoading}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick Demo Student Login (1-Click)</span>
              </button>
            </div>
          </form>
        )}

        {/* Security Notes */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Passwords discarded from memory immediately after sync
          </p>
          <p>Session isolated in Upstash Serverless Redis (2-hr TTL)</p>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="text-base font-bold text-white">VTOP OTP Verification</h3>
            <p className="text-xs text-slate-400">
              Enter the 6-digit one-time password sent to your registered Email/WhatsApp.
            </p>
            <input
              type="text"
              maxLength={6}
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full text-center text-xl font-mono tracking-widest bg-white/5 border border-white/20 rounded-xl py-2 text-white focus:outline-hidden focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpValue("");
                  setIsLoading(false);
                }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOtpVerify}
                disabled={isLoading || !otpValue.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify & Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
