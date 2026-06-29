"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import YpLogo from "../../../public/images/YPLogo.png";

// Only allow same-origin absolute paths so the gate can't be abused as an
// open redirect.
function safeRedirect(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function DevGateForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeRedirect(searchParams.get("callbackUrl"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerError = (message: string) => {
    setError(message);
    setShake(true);
    // Restart the animation if the user submits again quickly.
    window.setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/dev-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        // Full reload so the proxy re-runs with the new cookie.
        window.location.href = callbackUrl;
        return;
      }
      triggerError(data?.error || "Incorrect username or password");
      setLoading(false);
    } catch {
      triggerError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="devgate_overlay">
      <form
        className={`devgate_card ${shake ? "devgate_shake" : ""}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="devgate_logo">
          <Image src={YpLogo} alt="Young Pro" width={128} height={68} priority />
        </div>

        <h1 className="devgate_title">Restricted Access</h1>
        <p className="devgate_subtitle">
          This environment is private. Enter your credentials to continue.
        </p>

        <label className="devgate_label" htmlFor="devgate-username">
          Username
        </label>
        <input
          id="devgate-username"
          className="devgate_input"
          type="text"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />

        <label className="devgate_label" htmlFor="devgate-password">
          Password
        </label>
        <input
          id="devgate-password"
          className="devgate_input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />

        {error ? (
          <p className="devgate_error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="devgate_btn" type="submit" disabled={loading}>
          {loading ? "Verifying…" : "Continue"}
        </button>
      </form>

      <style jsx>{`
        .devgate_overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(
              1200px 600px at 50% -10%,
              rgba(32, 189, 255, 0.12),
              transparent 60%
            ),
            linear-gradient(180deg, #040f1f 0%, #020912 100%);
        }
        .devgate_card {
          width: 100%;
          max-width: 400px;
          padding: 32px 28px;
          border-radius: 18px;
          background: rgba(8, 18, 36, 0.92);
          border: 1px solid rgba(160, 174, 192, 0.28);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
        }
        .devgate_logo {
          align-self: center;
          margin-bottom: 20px;
        }
        .devgate_title {
          font-family: var(--font-plus-jakarta);
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          text-align: center;
          margin: 0 0 6px;
        }
        .devgate_subtitle {
          font-family: var(--font-dm-sans);
          font-size: 14px;
          line-height: 1.45;
          color: #a0aec0;
          text-align: center;
          margin: 0 0 22px;
        }
        .devgate_label {
          font-family: var(--font-plus-jakarta);
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 7px;
        }
        .devgate_input {
          height: 46px;
          padding: 0 14px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: rgba(2, 12, 25, 0.6);
          border: 1px solid rgba(160, 174, 192, 0.32);
          color: #ffffff;
          font-family: var(--font-dm-sans);
          font-size: 14px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .devgate_input::placeholder {
          color: #5b6b82;
        }
        .devgate_input:focus {
          border-color: #20bdff;
          box-shadow: 0 0 0 3px rgba(32, 189, 255, 0.18);
        }
        .devgate_error {
          font-family: var(--font-dm-sans);
          font-size: 13px;
          color: #ff6b6b;
          margin: -4px 0 14px;
        }
        .devgate_btn {
          height: 48px;
          margin-top: 6px;
          border: none;
          border-radius: 80px;
          cursor: pointer;
          color: #ffffff;
          font-family: var(--font-plus-jakarta);
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(90deg, #5433ff 0%, #23b8ff 100%);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .devgate_btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .devgate_btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .devgate_shake {
          animation: devgateShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
        @keyframes devgateShake {
          10%,
          90% {
            transform: translateX(-2px);
          }
          20%,
          80% {
            transform: translateX(4px);
          }
          30%,
          50%,
          70% {
            transform: translateX(-8px);
          }
          40%,
          60% {
            transform: translateX(8px);
          }
        }
      `}</style>
    </div>
  );
}
