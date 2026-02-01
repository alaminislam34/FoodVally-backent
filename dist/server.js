import { Server } from "http";
import app from "./app.js";
import config from "./app/config/index.js";
let server;
async function main() {
    try {
        server = app.listen(config.port, () => {
            console.log(`FoodVally backend is running on port ${config.port}`);
        });
    }
    catch (err) {
        console.log(err);
    }
}
main();
process.on("unhandledRejection", (err) => {
    console.log(`😈 unhandledRejection is detected , shutting down ...`, err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    }
    else {
        process.exit(1);
    }
});
process.on("uncaughtException", () => {
    console.log(`😈 uncaughtException is detected , shutting down ...`);
    process.exit(1);
});
