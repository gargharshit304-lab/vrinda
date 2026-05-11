import User from "../models/User.js";
import {
  buildProfilePayload,
  normalizePhone,
  normalizeProfileUpdateAddresses,
  sanitizeStoredAddresses
} from "../utils/userProfile.js";

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(buildProfilePayload(user));
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, phone, addresses } = req.body || {};
    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (name !== undefined) {
      const nextName = String(name || "").trim();
      if (!nextName) {
        const error = new Error("name cannot be empty");
        error.statusCode = 400;
        throw error;
      }

      user.name = nextName;
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone || "").trim();
      if (trimmedPhone) {
        const normalizedPhone = normalizePhone(trimmedPhone);
        if (!normalizedPhone) {
          const error = new Error("phone must be a 10-digit number");
          error.statusCode = 400;
          throw error;
        }

        user.phone = normalizedPhone;
      } else {
        user.phone = "";
      }
    }

    if (addresses !== undefined) {
      user.addresses = normalizeProfileUpdateAddresses(addresses);
    }

    await user.save();

    res.status(200).json(buildProfilePayload(user));
  } catch (error) {
    next(error);
  }
};

export const replaceUserAddressList = async (req, res, next) => {
  try {
    const { addresses = [] } = req.body || {};
    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    user.addresses = normalizeProfileUpdateAddresses(addresses);
    await user.save();

    res.status(200).json({
      ...buildProfilePayload(user),
      addresses: sanitizeStoredAddresses(user.addresses)
    });
  } catch (error) {
    next(error);
  }
};