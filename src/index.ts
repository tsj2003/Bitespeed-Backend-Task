import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./config/database";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// just a simple health check
app.get("/", (_req, res) => {
    res.json({ status: "up" });
});

app.use(identifyRouter);

AppDataSource.initialize()
    .then(() => {
        console.log("db connected");
        app.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("db connection failed:", err);
        process.exit(1);
    });
