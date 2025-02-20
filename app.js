const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const contentRoutes = require("./routes/content");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use(cors());

app.use("/", (req, res, next) => {
  console.log(req.method);
  console.log(req.url);
  next();
});

app.get("/", (req, res) => {
  res.send("Content Analyzer is up and running");
});

app.use("/api/content", contentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

const port = process.env.PORT || 5000;


app.listen(port, () => {
  console.log(`Server is up and running at http://localhost:${port}`);
});
