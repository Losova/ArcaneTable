export const APP_META = Object.freeze({
  collectionName: "Arcane Table",
  displayName: "Wizard Poker",
  version: "1.0.0-dev",
  channel: "V1 foundation",
  storageSchemaVersion: 2,
});

export const STORAGE_KEYS = Object.freeze({
  profile: "wizard-poker-profile-v1",
  settings: "wizard-poker-settings-v1",
  run: "wizard-poker-run-v1",
  onboarding: "wizard-table-onboarding-v1",
});

export const BUILD_STAMP = `${APP_META.version} · ${APP_META.channel}`;
