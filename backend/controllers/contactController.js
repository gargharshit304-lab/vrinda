import Contact from "../models/Contact.js";

export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      const error = new Error("All fields (name, email, message) are required");
      error.statusCode = 400;
      throw error;
    }

    await Contact.create({ name: String(name).trim(), email: String(email).trim().toLowerCase(), message: String(message).trim() });

    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    next(error);
  }
};

export default { createContactMessage, getAllContacts };
