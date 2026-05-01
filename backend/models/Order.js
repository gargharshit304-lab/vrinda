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
    statusHistory: {
      pendingAt: {
        type: Date,
        default: null
      },
      packedAt: {
        type: Date,
        default: null
      },
      outForDeliveryAt: {
        type: Date,
        default: null
      },
      deliveredAt: {
        type: Date,
        default: null
      }
    },
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
    },
    inventoryUpdatedAt: {
      type: Date,
      default: null
    },
    inventoryUpdateDetails: {
      updatedItems: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
          },
          name: String,
          quantity: Number,
          newStock: Number,
          newSoldCount: Number
        }
      ],
      errors: {
        type: [String],
        default: []
      }
    }
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;
