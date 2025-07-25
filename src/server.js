import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { app } from "./app.js";
import connectDB from "./db/db.js";

const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`⚙️ Server is running at port : ${port}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
