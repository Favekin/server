const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/digital_mechanic_db",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
connectDB();

// --- MODELS ---

// 1. User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// Helper to validate password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

// 2. Car Schema
const carSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

const Car = mongoose.model("Car", carSchema);

app.get("/", (req, res) => {
  res.send("Digital Mechanic API is running...");
});

app.post("/api/auth/login", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      if (await user.matchPassword(password)) {
        res.json({
          message: "Login successful",
          user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      } else {
        res.status(401).json({ message: "Invalid email or password" });
      }
    } else {
      if (name) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
          name,
          email,
          password: hashedPassword,
        });

        res.status(201).json({
          message: "User registered",
          user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      } else {
        res.status(404).json({ message: "User not found. Please register." });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/cars/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (
    !userId ||
    userId === "undefined" ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.json([]);
  }

  try {
    const cars = await Car.find({ userId: userId });
    res.json(cars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching cars" });
  }
});

app.post("/api/cars", async (req, res) => {
  const { make, model, year, userId } = req.body;

  if (
    !userId ||
    userId === "undefined" ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      message: "Invalid or missing User ID provided. Please log in again.",
    });
  }

  try {
    const car = new Car({
      userId,
      make,
      model,
      year,
    });

    const createdCar = await car.save();
    res.status(201).json(createdCar);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding car" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
