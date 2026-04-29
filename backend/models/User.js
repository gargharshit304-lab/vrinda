import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    isGoogleUser: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    isGoogleUser: this.isGoogleUser,
    role: this.role
  };
};

const User = mongoose.model("User", userSchema);

export default User;
