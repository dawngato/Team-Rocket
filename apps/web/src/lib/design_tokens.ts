import { ElectionState } from "./types";

export const DESIGN_TOKENS = {
  navy900: "#10233F",
  teal600: "#157E92",
  green600: "#15805D",
  amber600: "#AA6C0B",
  red600: "#C23C45",
  surface: "#F3F6FA",
  white: "#FFFFFF",
  text: "#17233B",
} as const;

export interface StateBadgeConfig {
  label: ElectionState;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconName: "check" | "clock" | "alert" | "vote" | "file";
  isConfirmed: boolean;
  description: string;
}

export function getStateBadgeConfig(state: ElectionState): StateBadgeConfig {
  switch (state) {
    case "WITNESSED":
      return {
        label: "WITNESSED",
        bgColor: "bg-[#15805D]/10 dark:bg-[#15805D]/20",
        textColor: "text-[#15805D] dark:text-[#34D399]",
        borderColor: "border-[#15805D]/30",
        iconName: "check",
        isConfirmed: true,
        description: "Witness signature verified against the configured key. Operator independence is not implied",
      };
    case "ANCHOR_FINALIZED":
      return {
        label: "ANCHOR_FINALIZED",
        bgColor: "bg-[#15805D]/10 dark:bg-[#15805D]/20",
        textColor: "text-[#15805D] dark:text-[#34D399]",
        borderColor: "border-[#15805D]/30",
        iconName: "check",
        isConfirmed: true,
        description: "Checkpoint recorded by the configured chain adapter. Public finality is not implied",
      };
    case "AUDIT_PASSED":
      return {
        label: "AUDIT_PASSED",
        bgColor: "bg-[#15805D]/10 dark:bg-[#15805D]/20",
        textColor: "text-[#15805D] dark:text-[#34D399]",
        borderColor: "border-[#15805D]/30",
        iconName: "check",
        isConfirmed: true,
        description: "Audit checks passed for the configured evidence profile",
      };
    case "AUDITOR_ATTESTED":
      return {
        label: "AUDITOR_ATTESTED",
        bgColor: "bg-[#15805D]/10 dark:bg-[#15805D]/20",
        textColor: "text-[#15805D] dark:text-[#34D399]",
        borderColor: "border-[#15805D]/30",
        iconName: "check",
        isConfirmed: true,
        description: "Auditor attestation signature verified against configured trust material",
      };
    case "PUBLISHED":
      return {
        label: "PUBLISHED",
        bgColor: "bg-[#15805D]/10 dark:bg-[#15805D]/20",
        textColor: "text-[#15805D] dark:text-[#34D399]",
        borderColor: "border-[#15805D]/30",
        iconName: "check",
        isConfirmed: true,
        description: "Publication gate completed for the configured evidence profile",
      };
    case "PENDING_WITNESS":
      return {
        label: "PENDING_WITNESS",
        bgColor: "bg-[#AA6C0B]/10 dark:bg-[#AA6C0B]/20",
        textColor: "text-[#AA6C0B] dark:text-[#FBBF24]",
        borderColor: "border-[#AA6C0B]/30",
        iconName: "clock",
        isConfirmed: false,
        description: "Awaiting next batch witness cosigning window",
      };
    case "ANCHOR_PENDING":
      return {
        label: "ANCHOR_PENDING",
        bgColor: "bg-[#AA6C0B]/10 dark:bg-[#AA6C0B]/20",
        textColor: "text-[#AA6C0B] dark:text-[#FBBF24]",
        borderColor: "border-[#AA6C0B]/30",
        iconName: "clock",
        isConfirmed: false,
        description: "Relayed to chain, waiting for required confirmation blocks",
      };
    case "DRAFT":
      return {
        label: "DRAFT",
        bgColor: "bg-slate-100 dark:bg-slate-800",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300 dark:border-slate-700",
        iconName: "file",
        isConfirmed: false,
        description: "Election specifications in progress, not yet frozen",
      };
    case "FROZEN":
      return {
        label: "FROZEN",
        bgColor: "bg-[#AA6C0B]/10 dark:bg-[#AA6C0B]/20",
        textColor: "text-[#AA6C0B] dark:text-[#FBBF24]",
        borderColor: "border-[#AA6C0B]/30",
        iconName: "clock",
        isConfirmed: false,
        description: "Manifest digest locked, roster immutable, awaiting voting window",
      };
    case "OPEN":
      return {
        label: "OPEN",
        bgColor: "bg-[#157E92]/10 dark:bg-[#157E92]/20",
        textColor: "text-[#157E92] dark:text-[#38BDF8]",
        borderColor: "border-[#157E92]/30",
        iconName: "vote",
        isConfirmed: false,
        description: "Voting booth actively receiving encrypted submissions",
      };
    case "FAILED":
      return {
        label: "FAILED",
        bgColor: "bg-[#C23C45]/10 dark:bg-[#C23C45]/20",
        textColor: "text-[#C23C45] dark:text-[#F87171]",
        borderColor: "border-[#C23C45]/30",
        iconName: "alert",
        isConfirmed: false,
        description: "Proof verification failure or broken cryptographic link detected",
      };
    case "DISPUTED":
      return {
        label: "DISPUTED",
        bgColor: "bg-[#C23C45]/10 dark:bg-[#C23C45]/20",
        textColor: "text-[#C23C45] dark:text-[#F87171]",
        borderColor: "border-[#C23C45]/30",
        iconName: "alert",
        isConfirmed: false,
        description: "Discrepancy registered by auditor or dual witness conflict",
      };
    default:
      return {
        label: state,
        bgColor: "bg-slate-100 dark:bg-slate-800",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300 dark:border-slate-700",
        iconName: "file",
        isConfirmed: false,
        description: "State status",
      };
  }
}
