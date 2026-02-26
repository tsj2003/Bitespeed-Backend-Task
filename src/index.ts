import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./config/database";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ status: "up" });
});

app.use(identifyRouter);

// retry connecting to the db a few times before giving up.
// on render free tier both the server and db can be cold at the same time,
// so the db might not be ready when the server first tries to connect.
async function connectWithRetry(retries = 5, delay = 3000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await AppDataSource.initialize();
            console.log("db connected");
            return;
        } catch (err) {
            console.error(`db connection attempt ${attempt}/${retries} failed:`, err);
            if (attempt === retries) throw err;
            console.log(`retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

connectWithRetry()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("gave up connecting to db:", err);
        process.exit(1);
    });
