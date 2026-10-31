"use client";

import React, { useState, useRef } from "react";
import {
  IdCard,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  X,
  FileX2,
  Lock,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";

interface VerificationResult {
  valid: boolean;
  message: string;
  reasons?: string[];
  extractedRollNo?: string;
}

export function StudentIdCardVerifier() {
  const [rollNumber, setRollNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload and validate dimensions/mime type
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setVerificationResult({
        valid: false,
        message: "Choose an image file to run the local format check.",
      });
      return;
    }

    setSelectedFile(file);
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Realistic ID Card Structure and Anti-Fraud Verification Engine
  const verifyIdCard = () => {
    if (!rollNumber.trim()) {
      setVerificationResult({
        valid: false,
        message: "Please enter your College Roll Number.",
      });
      return;
    }

    if (!selectedFile || !imagePreview) {
      setVerificationResult({
        valid: false,
        message: "Choose an image file to run the local format check.",
      });
      return;
    }

    setIsAnalyzing(true);
    setVerificationResult(null);

    // This local demo checks image dimensions and basic input format only.
    const img = new Image();
    img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;

        // ID Cards are typically landscape or portrait rectangular cards (aspect ratio between 1.2 and 1.8, or portrait 0.55 to 0.8)
        const isStandardIdCardRatio =
          (aspectRatio >= 1.15 && aspectRatio <= 1.9) ||
          (aspectRatio >= 0.55 && aspectRatio <= 0.85);

        // Format checks on Roll Number
        const cleanRoll = rollNumber.trim().toUpperCase();
        const hasValidFormat =
          cleanRoll.length >= 6 &&
          (/[A-Z]/.test(cleanRoll) || cleanRoll.includes("-") || cleanRoll.includes("/"));

        // Evaluate verification
        if (!hasValidFormat) {
          setIsAnalyzing(false);
          setVerificationResult({
            valid: false,
            message: "Unrecognized Roll Number format.",
            reasons: [
              "Roll number must follow campus convention (e.g., 2024-CSE-042 or TU/23/981).",
              "Verify your roll number against your semester fee slip or college registration.",
            ],
          });
          return;
        }

        if (!isStandardIdCardRatio) {
          setIsAnalyzing(false);
          setVerificationResult({
            valid: false,
            message: "The image dimensions do not match the supported rectangular formats.",
            reasons: [
              "The demo accepts only images with a supported rectangular aspect ratio.",
              "This demo does not read card text, inspect security features, or verify enrollment.",
              "Use the institution's configured eligibility service for an enrollment decision.",
            ],
          });
          return;
        }

        // Passing these checks does not establish that the image is an authentic ID.
        setIsAnalyzing(false);
        setVerificationResult({
          valid: true,
          message: "The image passed the local format checks. Enrollment has not been verified.",
          extractedRollNo: cleanRoll,
        });
    };
    img.onerror = () => {
      setIsAnalyzing(false);
      setVerificationResult({
        valid: false,
        message: "The selected image could not be read. Choose a valid image file and try again.",
      });
    };
    img.src = imagePreview;
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setVerificationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0b1b2d] to-[#050f1a] border border-cyan-500/25 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-cyan-950/40">
        {/* Glow Effects */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <IdCard className="w-3.5 h-3.5" />
              <span>LOCAL IMAGE CHECK DEMO</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Student ID Image Format Check
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              This browser checks the image file type, dimensions, and roll-number format. It does not read the card, verify enrollment, or issue voting credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start md:self-auto font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>No Enrollment Service Connected</span>
          </div>
        </div>

        {/* Form and Verification Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-6">
          {/* Left Column: Form & Upload (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Roll Number Input */}
            <div>
              <label htmlFor="student-roll-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                College Roll Number / Registration No. <span className="text-cyan-400">*</span>
              </label>
              <input
                id="student-roll-input"
                aria-label="College Roll Number or Registration Number"
                type="text"
                name="student-roll-number"
                autoComplete="off"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 2024-CSE-042 or TU/23/108"
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/90 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                The value is checked for a basic text pattern only; it is not compared with a roster.
              </span>
            </div>

            {/* ID Card Image Upload Zone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Select an Image File <span className="text-cyan-400">*</span>
              </label>

              {!imagePreview ? (
                <label
                  htmlFor="student-id-file-input"
                  className="block border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors group"
                >
                  <input
                    ref={fileInputRef}
                    id="student-id-file-input"
                    aria-label="Select an image file for the local format check"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <div className="size-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Select an image file
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Image files only. The demo does not inspect card text or security features.
                  </p>
                  <span className="inline-block mt-3 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium">
                    No enrollment decision is made
                  </span>
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-900 p-2">
                  <div className="relative max-h-56 overflow-hidden rounded-xl bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Uploaded ID Card Preview"
                      className="max-h-52 w-auto object-contain rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="absolute top-2 right-2 size-7 rounded-full bg-slate-900/80 hover:bg-rose-950 text-white flex items-center justify-center border border-white/20 transition-colors"
                      title="Remove image"
                      aria-label="Remove selected image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px]">{selectedFile?.name}</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      Change Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      aria-label="Change Student ID Card Photo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={verifyIdCard}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Checking Image Format…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Check Image Format</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Verification Status Badge (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            {verificationResult?.valid ? (
              /* Success Card */
              <div className="rounded-3xl bg-emerald-950/30 border border-emerald-500/50 p-6 space-y-4 shadow-xl shadow-emerald-950/30 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-300">
                      Image Format Check Passed
                    </h4>
                    <p className="text-[11px] text-emerald-400/80">
                      Enrollment has not been verified
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/30 p-4 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Entered Roll Number:</span>
                    <span className="text-white font-bold">{verificationResult.extractedRollNo}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Image Check:</span>
                    <span className="text-emerald-400">Basic format accepted</span>
                  </div>
                  <div className="flex justify-between text-slate-400 border-t border-white/10 pt-2">
                    <span>Voting Credential:</span>
                    <span className="text-cyan-300 font-bold">Not issued</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  <span><strong>Demo Limit:</strong> This browser check does not contact an enrollment roster, issue a voting credential, or cast a ballot.</span>
                </div>

                <Link
                  href="/elections"
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <span>View Elections</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : verificationResult?.valid === false ? (
              /* Rejection Card */
              <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-6 space-y-4 shadow-xl shadow-rose-950/30 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <FileX2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-rose-300">
                      Verification Rejected
                    </h4>
                    <p className="text-[11px] text-rose-400/80">
                      The local image or text format checks did not pass
                    </p>
                  </div>
                </div>

                <p className="text-xs text-rose-200 font-medium">
                  {verificationResult.message}
                </p>

                {verificationResult.reasons && (
                  <ul className="text-xs text-slate-300 space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-rose-500/20 list-disc list-inside">
                    {verificationResult.reasons.map((r, i) => (
                      <li key={i} className="text-slate-300">{r}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                >
                  Try Again with Valid College ID
                </button>
              </div>
            ) : (
              /* Idle / Instructions Card */
              <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <BadgeCheck className="w-4 h-4 text-cyan-400" />
                  <span>What This Demo Checks</span>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="flex gap-2.5 items-start">
                    <span className="size-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                    <span><strong>Image format:</strong> The demo checks that the selected file is an image and has a supported rectangular aspect ratio.</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="size-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                    <span><strong>Roll-number format:</strong> The entered value is checked for a basic text pattern. No roster lookup occurs.</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="size-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                    <span><strong>No credential issued:</strong> This demo does not issue a blind credential or establish identity separation.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
