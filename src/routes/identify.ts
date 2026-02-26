import { Router, Request, Response } from "express";
import { identifyContact } from "../services/contact.service";

const router = Router();

router.post("/identify", async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({
                error: "need at least one of email or phoneNumber",
            });
        }

        // phoneNumber might come in as a number from the json body, so cast it
        const phone = phoneNumber ? String(phoneNumber) : null;
        const mail = email ? String(email) : null;

        const result = await identifyContact(mail, phone);
        return res.status(200).json(result);
    } catch (err) {
        console.error("something broke in /identify:", err);
        return res.status(500).json({ error: "internal server error" });
    }
});

export default router;
