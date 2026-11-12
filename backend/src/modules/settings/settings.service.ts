// src/modules/settings/settings.service.ts
//
// The store's own details (name, GSTIN, address, support contact). There is
// one settings document; it is created with defaults the first time it is read.
import { StoreSettings } from "../../database/models/StoreSettings";
import { SettingsUpdateInput } from "./settings.schema";

const KEY = "store";

export async function getSettings() {
  const settings = await StoreSettings.findOneAndUpdate(
    { key: KEY },
    { $setOnInsert: { key: KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings!;
}

/** The part of the settings any visitor may see (for the storefront footer / contact page). */
export async function getPublicSettings() {
  const s = await getSettings();
  return {
    storeName:    s.storeName,
    supportPhone: s.supportPhone || null,
    supportEmail: s.supportEmail || null,
    address:      { city: s.address?.city || null, state: s.address?.state || null },
  };
}

/** Change only the fields that were sent; address fields are changed one by one too. */
export async function updateSettings(input: SettingsUpdateInput) {
  const settings = await getSettings();
  const { address, ...fields } = input;

  Object.assign(settings, fields);
  if (address) {
    for (const [field, value] of Object.entries(address)) {
      settings.set(`address.${field}`, value);
    }
  }

  await settings.save();
  return settings;
}
