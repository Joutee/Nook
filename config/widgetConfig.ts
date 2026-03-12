import React from "react";
import { RepaymentWidget } from "@/components/dashboard_widgets/RepaymentWidget";
import { IssuesWidget } from "@/components/dashboard_widgets/IssuesWidget";
import { MyChoresWidget } from "@/components/dashboard_widgets/MyChoresWidget";
import { FlatsWidget } from "@/components/dashboard_widgets/FlatsWidget";
import { FlatMembersWidget } from "@/components/dashboard_widgets/FlatMembersWidget";
import { DocumentsWidget } from "@/components/dashboard_widgets/DocumentsWidget";
import { ChoreLeaderBoardWidget } from "@/components/dashboard_widgets/ChoreLeaderBoardWidget";

export const DEFAULT_WIDGETS = [
  "my_chores_widget",
  "repayment_widget",
  "issues_widget",
];

// Výchozí widgety podle role
export const DEFAULT_WIDGETS_BY_ROLE: Record<
  "pronajimatel" | "najemce",
  string[]
> = {
  pronajimatel: ["issues_widget", "flats_widget"],
  najemce: ["my_chores_widget", "repayment_widget", "issues_widget"],
};

// Mapování klíčů na lidsky čitelné názvy
export const WIDGET_NAMES: Record<string, string> = {
  repayment_widget: "Vyrovnání dluhů",
  issues_widget: "Poslední závady",
  my_chores_widget: "Moje úkoly",
  flats_widget: "Moje byty",
  flat_members_widget: "Členové bytu",
  documents_widget: "Dokumenty",
  chore_leaderboard_widget: "Žebříček plnění úkolů",
};

// Mapování klíčů na ikony
export const WIDGET_ICONS: Record<string, any> = {
  repayment_widget: "cash-outline",
  issues_widget: "warning-outline",
  my_chores_widget: "checkmark-circle-outline",
  flats_widget: "home-outline",
  flat_members_widget: "people-outline",
  documents_widget: "document-text-outline",
  chore_leaderboard_widget: "trophy-outline",
};

// Mapování klíčů na komponenty
export const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  repayment_widget: RepaymentWidget,
  issues_widget: IssuesWidget,
  my_chores_widget: MyChoresWidget,
  flats_widget: FlatsWidget,
  flat_members_widget: FlatMembersWidget,
  documents_widget: DocumentsWidget,
  chore_leaderboard_widget: ChoreLeaderBoardWidget,
};

// Všechny dostupné widgety
export const ALL_WIDGETS = [
  "my_chores_widget",
  "repayment_widget",
  "issues_widget",
  "flats_widget",
  "flat_members_widget",
  "documents_widget",
  "chore_leaderboard_widget",
];

// Mapování widgetů na role - které widgety jsou dostupné pro koho
export const WIDGETS_BY_ROLE: Record<"pronajimatel" | "najemce", string[]> = {
  pronajimatel: [
    "issues_widget",
    "flats_widget",
    "flat_members_widget",
    "documents_widget",
    // Pronajímatel NEVIDÍ my_chores_widget
  ],
  najemce: [
    "my_chores_widget",
    "repayment_widget",
    "issues_widget",
    "flat_members_widget",
    "documents_widget",
    "flats_widget",
    "chore_leaderboard_widget",
  ],
};

// Helper funkce pro získání widgetů podle role
export const getWidgetsByRole = (
  role: "pronajimatel" | "najemce" | null,
): string[] => {
  if (!role) return [];
  return WIDGETS_BY_ROLE[role] || [];
};

// Helper funkce pro získání výchozích widgetů podle role
export const getDefaultWidgetsByRole = (
  role: "pronajimatel" | "najemce" | null,
): string[] => {
  if (!role) return DEFAULT_WIDGETS;
  return DEFAULT_WIDGETS_BY_ROLE[role] || DEFAULT_WIDGETS;
};
