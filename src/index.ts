import * as dotenv from "dotenv";

import express from "express";
import cors from "cors";

import slack from "./routes/slack";

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use("/slack", slack);
const port = 9000;

app.listen(port, () => {
  console.log(`🚀 Server ready at http://localhost:${port}`);
});
