const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

const upload = multer({ dest: "uploads/" });

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.post("/generate-text", async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: "Error generating text" });
    }
});

const imageToGenerativePart = (filePath) => ({
    inlineData: {
        data: fs.readFileSync(filePath).toString("base64"),
        mimeType: "image/png",
    },
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
    const prompt = req.body.prompt || "Jelaskan gambar ini secara detail.";
    const image = imageToGenerativePart(req.file.path);

    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: "Error generating text from image" });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up uploaded file
    }
});

app.post(
    "/generate-from-document",
    upload.single("document"),
    async (req, res) => {
        const filePath = req.file.path;
        const buffer = fs.readFileSync(filePath);
        const base64Data = buffer.toString("base64");
        const mimeType = req.file.mimetype;

        try {
            const documentPart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            };
            const result = await model.generateContent([
                "Jelaskan isi dokumen ini secara detail.",
                documentPart,
            ]);
            const response = await result.response;
            res.json({ output: response.text() });
        } catch (error) {
            res.status(500).json({
                error: "Error generating text from document",
            });
        } finally {
            fs.unlinkSync(filePath); // Clean up uploaded file
        }
    }
);

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const audioBase64 = audioBuffer.toString("base64");
    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: req.file.mimetype,
        },
    };

    try {
        const result = await model.generateContent([
            "Jelaskan isi audio ini secara detail.",
            audioPart,
        ]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({
            error: "Error generating text from audio",
        });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up uploaded file
    }
});
