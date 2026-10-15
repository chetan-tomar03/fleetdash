require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => res.send(`Server running on port ${PORT}`));

app.listen(PORT);