import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

const PORT = process.env.PORT || 5000;

// DB connects before the server listens, so no request hits a dead connection.
const start = async () => {
  try {
    await connectDB();
  } catch {
    // connectDB has already logged the reason and a hint.
    process.exit(1);
  }
  app.get("/", (req, res) => {
    res.send("My Shopkart Backend API is working!");
  });
  const server = app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
  });

  // Without this, a busy port surfaces as a raw unhandled 'error' event.
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the process holding it, or set a different PORT in .env.`,
      );
    } else {
      console.error("Server error:", error.message);
    }

    process.exit(1);
  });
};

start();
