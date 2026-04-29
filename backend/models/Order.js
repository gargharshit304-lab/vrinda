import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    shippingAddress: {
      fullName: String,
      phoneNumber: String,
      address: String,
      city: String,
      pincode: String
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "FAKE_UPI"],
      default: "COD"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    status: {
      type: String,
      enum: ["Pending", "Packed", "Out for Delivery", "Delivered"],
      default: "Pending"
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Pending", "Packed", "Out for Delivery", "Delivered"],
          required: true
        },
        updatedAt: {
          type: Date,
          required: true
        }
      }
    ],
    orderStatus: {
      type: String,
      enum: ["processing", "packed", "shipped", "delivered", "cancelled"],
      default: "processing"
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;
