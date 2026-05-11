import mongoose from "mongoose";

const isDevelopment = process.env.NODE_ENV !== "production";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vrinda_ecommerce";

  try {
    await mongoose.connect(mongoUri);
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("MongoDB connected");
    }
  } catch (error) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error("MongoDB connection failed:", error.message);
    }
    throw error;
  }
};

export default connectDB;
