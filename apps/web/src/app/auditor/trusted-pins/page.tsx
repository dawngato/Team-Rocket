"use client";

import React, { useState } from "react";
import { Key, Plus, ShieldCheck, CheckCircle2 } from "lucide-react";
import { INITIAL_TRUSTED_PINS } from "../../lib/mock_data";
import { TrustedPin } from "../../lib/types";
import { apiClient } from "../../lib/api_client";

export default function AuditorTrustedPinsPage() {
  const [pins, setPins] = useState<TrustedPin[]>(INITIAL_TRUSTED_PINS);
  const [label, setLabel] = useState("");
  const [service, setService] = useState<"WITNESS" | "CHAIN" | "IDENTITY">("WITNESS");
  const [keySpki, setKeySpki] = useState("");
  const [algorithm, setAlgorithm] = useState("Ed25519");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await apiClient.addTrustedPin({
      label,
      service,
      public_key_spki: keySpki,
      algorithm,
      active: true,
    });
    setPins([created, ...pins]);
    setLabel("");
    setKeySpki("");
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <Key className="w-3.5 h-3.5" aria-hidden="true" />
            Zero Trust Root of Trust
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Auditor Trusted Pins Store
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Pinned public keys for independent witness nodes, identity authorities, and blockchain anchor contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{isAdding ? "Cancel" : "Add Trusted Pin"}</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddPin}
          className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
        >
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Register New Public Key Pin
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="pin-label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pin Label
              </label>
              <input
                id="pin-label"
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. State Research Consortium Witness"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="pin-service" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Service Domain
              </label>
              <select
                id="pin-service"
                value={service}
                onChange={(e) => setService(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="WITNESS">WITNESS</option>
                <option value="CHAIN">CHAIN</option>
                <option value="IDENTITY">IDENTITY</option>
              </select>
            </div>

            <div>
              <label htmlFor="pin-algorithm" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cryptographic Algorithm
              </label>
              <select
                id="pin-algorithm"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="Ed25519">Ed25519</option>
                <option value="EVM Smart Contract">EVM Smart Contract</option>
                <option value="RSA Blind Signature 4096 / PSS">RSA Blind Signature 4096</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="pin-key-spki" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Public Key SPKI or Contract Address
              </label>
              <input
                id="pin-key-spki"
                type="text"
                required
                value={keySpki}
                onChange={(e) => setKeySpki(e.target.value)}
                placeholder="MCowBQYDK2VwAyEAfv3sL7+18KzQkH9+mE5K1kGqVwY1LzX4jT1qS9aW8uQ="
                className="w-full min-h-[44px] px-3 py-2 rounded-lg font-mono text-xs border border-slate-300 dark:border-[#1E3352] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors text-sm shadow-sm"
          >
            Store Trusted Pin
          </button>
        </form>
      )}

      {/* Pins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#157E92] bg-[#157E92]/10 px-2 py-0.5 rounded">
                {pin.service}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {pin.algorithm}
              </span>
            </div>
            <h2 className="font-bold text-base text-[#10233F] dark:text-white">
              {pin.label}
            </h2>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
              {pin.public_key_spki}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Pinned: {new Date(pin.pinned_at_utc).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
