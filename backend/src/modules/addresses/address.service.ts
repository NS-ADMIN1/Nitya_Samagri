// src/modules/addresses/address.service.ts
//
// Every function takes the logged-in user's ID and filters by it, so a
// user can only ever see, edit or delete their own addresses.
import { Address } from "../../database/models/Address";
import { AppError } from "../../utils/AppError";
import { AddressCreateInput, AddressUpdateInput } from "./address.schema";

/** All of a user's addresses, default first. */
export function listAddresses(userId: string) {
  return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

export async function getAddress(userId: string, id: string) {
  const address = await Address.findOne({ _id: id, userId }).lean();
  if (!address) throw new AppError("Address not found", 404);
  return address;
}

/**
 * The first address a user adds is always made the default; `isDefault:
 * true` on a later one unsets it on the rest.
 */
export async function createAddress(userId: string, input: AddressCreateInput) {
  const existingCount = await Address.countDocuments({ userId });
  const makeDefault = input.isDefault === true || existingCount === 0;

  if (makeDefault) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }

  return Address.create({ ...input, userId, isDefault: makeDefault });
}

export async function updateAddress(userId: string, id: string, input: AddressUpdateInput) {
  const address = await Address.findOne({ _id: id, userId });
  if (!address) throw new AppError("Address not found", 404);

  if (input.isDefault === true) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }

  Object.assign(address, input);
  await address.save();
  return address;
}

/**
 * If the deleted address was the default, the most recent remaining one is
 * promoted so checkout always has a default to fall back on.
 */
export async function deleteAddress(userId: string, id: string) {
  const address = await Address.findOne({ _id: id, userId });
  if (!address) throw new AppError("Address not found", 404);

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const next = await Address.findOne({ userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
}
