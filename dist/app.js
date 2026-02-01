import express, {} from "express";
import cors from "cors";
import router from "./app/routes/index.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";
const app = express();
// Parsers
app.use(express.json());
app.use(cors());
// Application routes
app.use("/api/v1", router);
const getAController = (_req, res) => {
    res.send("Welcome to FoodVally Backend!");
};
app.get("/", getAController);
// Global Error Handler
app.use(globalErrorHandler);
// Not Found
app.use(notFound);
export default app;
