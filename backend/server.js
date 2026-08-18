require("dotenv").config();
const express = require("express");
const cors = require("cors");
const devicesRouter = require("./routes/devices");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/devices", devicesRouter);

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});