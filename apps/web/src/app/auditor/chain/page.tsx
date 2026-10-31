"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Blocks,
  Check,
  Copy,
  Fingerprint,
  Layers3,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "../../../lib/api_client";
import type { Election, EvidencePackage } from "../../../lib/types";

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    return "Not included in this record";
  }
  return new Intl.NumberFormat().format(value);
}

function EvidenceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="chain-evidence-field">
      <dt>{label}</dt>
      <dd translate="no">{value}</dd>
    </div>
  );
}

export default function AuditorChainAnchorPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selected, setSelected] = useState("");
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [electionError, setElectionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const requestId = useRef(0);

  const loadElections = useCallback(async () => {
    requestId.current += 1;
    setLoadingEvidence(false);
    setEvidence(null);
    setHasQueried(false);
    setError(null);
    setLoadingElections(true);
    setElectionError(null);
    try {
      const rows = await apiClient.getElections();
      setElections(rows);
      setSelected((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
    } catch (cause) {
      setElectionError(cause instanceof Error ? cause.message : "The election list is unavailable.");
    } finally {
      setLoadingElections(false);
    }
  }, []);

  useEffect(() => {
    void loadElections();
  }, [loadElections]);

  const handleElectionChange = (value: string) => {
    requestId.current += 1;
    setSelected(value);
    setEvidence(null);
    setError(null);
    setFeedback("");
    setLoadingEvidence(false);
    setHasQueried(false);
  };

  const queryEvidence = async () => {
    if (!selected || loadingEvidence) return;
    const activeRequest = ++requestId.current;
    setLoadingEvidence(true);
    setEvidence(null);
    setError(null);
    setFeedback("");
    setHasQueried(false);
    try {
      const record = await apiClient.getEvidence(selected);
      if (requestId.current !== activeRequest) return;
      setEvidence(record);
      setHasQueried(true);
    } catch (cause) {
      if (requestId.current !== activeRequest) return;
      setError(cause instanceof Error ? cause.message : "Authoritative evidence is unavailable.");
    } finally {
      if (requestId.current === activeRequest) setLoadingEvidence(false);
    }
  };

  const copyTransactionHash = async () => {
    if (!evidence?.anchor_tx_hash) return;
    try {
      await navigator.clipboard.writeText(evidence.anchor_tx_hash);
      setFeedback("Transaction hash copied.");
    } catch {
      setFeedback("Clipboard access is unavailable. Select the hash to copy it manually.");
    }
  };

  return (
    <div className="chain-page">
      <section className="chain-hero" aria-labelledby="chain-page-title">
        <div className="chain-hero-copy">
          <p className="chain-kicker"><Blocks aria-hidden="true" /> Auditor workspace <span>/</span> Chain evidence</p>
          <h1 id="chain-page-title">An anchor record, <em>clearly in view.</em></h1>
          <p className="chain-hero-description">
            Inspect the evidence package released for an election. This screen reports what the API returned and keeps independent chain verification explicit.
          </p>
          <div className="chain-hero-facts" aria-label="Verification boundaries">
            <div><span>Evidence source</span><strong>Authoritative API</strong></div>
            <div><span>Chain finality</span><strong className="chain-limited"><i aria-hidden="true" /> Not checked here</strong></div>
          </div>
        </div>

        <div className="chain-visual" role="img" aria-label="Schematic evidence path from election manifest to witness checkpoint to chain anchor. This illustration does not verify the records.">
          <div className="chain-visual-grid" aria-hidden="true" />
          <div className="chain-visual-topline"><span>Evidence path</span><span>SCHEMATIC</span></div>
          <div className="chain-orbit chain-orbit-one" aria-hidden="true" />
          <div className="chain-orbit chain-orbit-two" aria-hidden="true" />
          <div className="chain-trace chain-trace-one" aria-hidden="true" />
          <div className="chain-trace chain-trace-two" aria-hidden="true" />
          <div className="chain-visual-node chain-visual-node-manifest" aria-hidden="true">
            <Fingerprint />
            <span>Manifest</span>
            <small>Election context</small>
          </div>
          <div className="chain-visual-node chain-visual-node-witness" aria-hidden="true">
            <Layers3 />
            <span>Checkpoint</span>
            <small>Witness record</small>
          </div>
          <div className="chain-cube-wrap" aria-hidden="true">
            <div className="chain-cube">
              <i className="chain-cube-face chain-cube-front" />
              <i className="chain-cube-face chain-cube-back" />
              <i className="chain-cube-face chain-cube-right" />
              <i className="chain-cube-face chain-cube-left" />
              <i className="chain-cube-face chain-cube-top" />
              <i className="chain-cube-face chain-cube-bottom" />
              <span className="chain-cube-mark"><Blocks /></span>
            </div>
          </div>
          <div className="chain-visual-node chain-visual-node-anchor" aria-hidden="true">
            <span className="chain-anchor-dot" />
            <span>Anchor</span>
            <small>Chain receipt</small>
          </div>
          <p className="chain-visual-caption">A data map, not a live chain connection</p>
        </div>
      </section>

      <section className="chain-inspector" aria-labelledby="chain-inspector-title">
        <div className="chain-inspector-heading">
          <div>
            <p className="chain-section-index">01 <span>Record lookup</span></p>
            <h2 id="chain-inspector-title">Choose an election to inspect</h2>
          </div>
          <span className="chain-readonly-tag"><ShieldAlert aria-hidden="true" /> Read only</span>
        </div>

        <div className="chain-controls">
          <div className="chain-election-field">
            <label htmlFor="chain-election">Election record</label>
            <select
              id="chain-election"
              value={selected}
              onChange={(event) => handleElectionChange(event.target.value)}
              disabled={loadingElections || elections.length === 0}
            >
              <option value="">{loadingElections ? "Loading elections…" : "Select an election"}</option>
              {elections.map((election) => <option key={election.id} value={election.id}>{election.title}</option>)}
            </select>
            <span className="chain-field-hint">
              {loadingElections ? "Loading available records" : `${new Intl.NumberFormat().format(elections.length)} election${elections.length === 1 ? "" : "s"} available`}
            </span>
          </div>
          <div className="chain-control-actions">
            <button
              type="button"
              className="chain-button chain-button-primary"
              onClick={() => void queryEvidence()}
              disabled={!selected || loadingEvidence || loadingElections}
            >
              {loadingEvidence ? <RefreshCw className="chain-refresh-spin" aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}
              <span>{loadingEvidence ? "Querying evidence…" : "Query evidence"}</span>
            </button>
            <button
              type="button"
              className="chain-button chain-button-secondary"
              onClick={() => void loadElections()}
              disabled={loadingElections}
            >
              <RefreshCw aria-hidden="true" />
              <span>Refresh list</span>
            </button>
          </div>
        </div>

        <p className="chain-live-feedback" aria-live="polite" aria-atomic="true">
          {feedback || (loadingEvidence ? "Requesting the evidence package…" : "")}
        </p>

        {electionError && (
          <div className="chain-alert" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div><strong>Election list unavailable</strong><p>{electionError} Check the configured election API, then refresh the list.</p></div>
          </div>
        )}
        {error && (
          <div className="chain-alert" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div><strong>Evidence request failed</strong><p>{error} Confirm the election service is available, then query again.</p></div>
          </div>
        )}

        {loadingEvidence && (
          <div className="chain-query-state" role="status" aria-live="polite">
            <span className="chain-query-indicator" aria-hidden="true" />
            <span>Waiting for the authoritative evidence API</span>
          </div>
        )}

        {!loadingEvidence && hasQueried && !evidence && !error && (
          <div className="chain-empty-state" role="status">
            <span className="chain-empty-mark"><Blocks aria-hidden="true" /></span>
            <div><strong>No released evidence record</strong><p>The API returned no evidence package for this election. Check its release state or select another election.</p></div>
          </div>
        )}

        {!loadingEvidence && !hasQueried && !evidence && !error && !electionError && elections.length === 0 && (
          <div className="chain-empty-state chain-empty-initial" role="status">
            <span className="chain-empty-mark"><Blocks aria-hidden="true" /></span>
            <div><strong>No elections available</strong><p>There are no election records to inspect yet. Refresh the list after elections are released.</p></div>
          </div>
        )}

        {!loadingEvidence && !hasQueried && !evidence && !error && !electionError && elections.length > 0 && (
          <div className="chain-empty-state chain-empty-initial">
            <span className="chain-empty-mark"><Blocks aria-hidden="true" /></span>
            <div><strong>Evidence appears here after a query</strong><p>Select an election, then request the released record from the authoritative API.</p></div>
          </div>
        )}

        {evidence && (
          <section className="chain-evidence-result" aria-labelledby="chain-evidence-title">
            <div className="chain-result-heading">
              <div>
                <p className="chain-section-index">02 <span>Returned evidence</span></p>
                <h3 id="chain-evidence-title">Anchor receipt details</h3>
              </div>
              <span className="chain-result-status"><Check aria-hidden="true" /> API record received</span>
            </div>

            <div className="chain-finality-note" role="note">
              <ShieldAlert aria-hidden="true" />
              <p><strong>Independent finality is not verified.</strong> This page has not checked an RPC endpoint, trusted chain ID, contract code, transaction receipt, or confirmation depth.</p>
            </div>

            <dl className="chain-evidence-grid">
              <div className="chain-evidence-field chain-evidence-field-wide">
                <dt>Final checkpoint digest</dt>
                <dd translate="no">{evidence.final_checkpoint_digest}</dd>
              </div>
              <div className="chain-evidence-field chain-evidence-field-wide chain-tx-field">
                <dt>Anchor transaction hash</dt>
                <dd translate="no">{evidence.anchor_tx_hash}</dd>
                <button type="button" className="chain-copy-button" onClick={() => void copyTransactionHash()} aria-label="Copy anchor transaction hash">
                  <Copy aria-hidden="true" /><span>Copy hash</span>
                </button>
              </div>
              <EvidenceField label="Manifest digest" value={evidence.manifest_digest} />
              <EvidenceField label="Auditor signature" value={evidence.auditor_signature} />
              <EvidenceField label="Chain ID" value={evidence.chain_id === undefined ? "Not included in this record" : formatNumber(evidence.chain_id)} />
              <EvidenceField label="Block number" value={formatNumber(evidence.block_number)} />
              <EvidenceField label="Witness key ID" value={evidence.witness_key_id || "Not included in this record"} />
            </dl>

            <p className="chain-result-footnote"><span aria-hidden="true" /> Values above are reported by the evidence API. They do not establish public-chain finality by themselves.</p>
          </section>
        )}
      </section>
    </div>
  );
}
