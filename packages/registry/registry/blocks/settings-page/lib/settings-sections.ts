import type { SettingsNavSection } from "../components/settings-nav";

export const ORGANIZATION_SETTINGS_SECTIONS: SettingsNavSection[] = [
  {
    label: "Organization",
    items: [
      { to: "/settings/general", label: "General" },
      { to: "/settings/members", label: "Members" },
    ],
  },
];

export const SETTINGS_GENERAL_PATH = "/settings/general";
export const SETTINGS_MEMBERS_PATH = "/settings/members";
