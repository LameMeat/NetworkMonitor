const fs = require("fs");
const NetworkMonitor = require("./Monitor");

const configPath = "./config.json"

// Ensure config.json exists, or create a default one
if (!fs.existsSync(configPath)) {
    console.log("Configuration file not found. Creating a default config.json...");
    const defaultConfig = {
        addresses: {
            google: "www.google.com",
            router: "192.168.0.1"
        },
        logFilePath: "events.log",
        requestInterval: 1,
        flushInterval: 60
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

// Load the configuration file
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
    console.error("Error reading configuration file:", err.message);
    process.exit(1);
}

// Start the network monitor
console.log("Starting network monitor with the following configuration:");
console.log(config);
const monitor = new NetworkMonitor(configPath);
monitor.startMonitoring();