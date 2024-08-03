import path from "path";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { v2 as cloudinary } from "cloudinary";
import { app, server } from "./socket/socket.js";
import job from "./cron/cron.js";
import crypto from "crypto";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

connectDB();
job.start();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middlewares
app.use(express.json({ limit: "50mb" })); // To parse JSON data in the req.body
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());

app.use(bodyParser.json());
app.use(cors());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);

// Get ZEGO credentials from environment variables
const ZEGO_APP_ID = process.env.ZEGO_APP_ID;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET;

// Endpoint to generate a ZEGO token
app.get('/api/token', (req, res) => {
  const { userID, roomID } = req.query;

  if (!userID || !roomID) {
    return res.status(400).json({ error: 'Missing userID or roomID' });
  }

  // Generate a token for the user
  const token = generateZegoToken(userID, roomID);

  res.json({ token });
});

// Function to generate ZEGO token
function generateZegoToken(userID, roomID) {
  // This is a simplified example. In production, use ZEGO's official SDK or REST API
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).substr(2, 16);
  const signature = crypto.createHmac('sha256', ZEGO_SERVER_SECRET)
    .update(`${ZEGO_APP_ID}${userID}${roomID}${timestamp}${random}`)
    .digest('hex');

  return `${ZEGO_APP_ID}:${userID}:${roomID}:${timestamp}:${random}:${signature}`;
}


// http://localhost:5000 => backend,frontend

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	// react app
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

server.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
