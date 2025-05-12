const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

class NetworkMonitor {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = this.loadConfig();
        this.validateConfig();
        this.logFilePath = this.config.logFilePath || "events.log";
        this.requestInterval = this.config.requestInterval || 1; // Default to 1 second
        this.flushInterval = this.config.flushInterval || 60; // Default to 60 seconds
        this.countdown = this.flushInterval;
        this.statuses = {};
        this.aggregatedLogs = {}; // In-memory structure for aggregation

        this.initializeStatuses();
    }

    // Load configuration from JSON file
    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, "utf8");
            return JSON.parse(data);
        } catch (err) {
            console.error("Error loading configuration file:", err.message);
            process.exit(1);
        }
    }

    // Validate configuration structure
    validateConfig() {
        if (!this.config.addresses || typeof this.config.addresses !== "object") {
            throw new Error("Invalid configuration: 'addresses' must be an object with server names as keys and addresses as values.");
        }
        if (typeof this.config.requestInterval !== "number" || this.config.requestInterval <= 0) {
            throw new Error("Invalid configuration: 'requestInterval' must be a positive number.");
        }
        if (typeof this.config.flushInterval !== "number" || this.config.flushInterval <= 0) {
            throw new Error("Invalid configuration: 'flushInterval' must be a positive number.");
        }
    }

    // Initialize statuses and logs
    initializeStatuses() {
        for (const server in this.config.addresses) {
            this.statuses[server] = "unknown";
            this.aggregatedLogs[server] = {
                passed: 0,
                failed: 0,
                firstPingTime: null,
                lastPingTime: null,
                averageResponseTime: 0,
                aggregateResponseTime: 0
            };
        }
    }

    // Send requests to all configured addresses
    sendRequests() {
        const currentTime = new Date().toISOString();

        for (const server in this.config.addresses) {
            const address = this.config.addresses[server];
            this.pingAddress(address, (success, responseTime) => {
                this.handlePingResult(server, success, responseTime, currentTime);
            });
        }
    }

    // Handle the result of a ping
    handlePingResult(server, success, responseTime, currentTime) {
        const log = this.aggregatedLogs[server];

        if (success) {
            log.passed++;
            log.aggregateResponseTime += responseTime;
        } else {
            log.failed++;
        }

        if (!log.firstPingTime) {
            log.firstPingTime = currentTime;
        }
        log.lastPingTime = currentTime;

        // Calculate average response time
        const totalPings = log.passed + log.failed;
        log.averageResponseTime = totalPings > 0 ? (log.aggregateResponseTime / log.passed).toFixed(2) : 0;
    }

    // Ping a specific address
    pingAddress(address, callback) {
        const pingCmd = os.platform() === "win32" ? `ping -n 1 ${address}` : `ping -c 1 ${address}`;

        exec(pingCmd, (error, stdout, stderr) => {
            if (error || stderr) {
                callback(false, 0);
                return;
            }

            // Parse response time from ping output
            const responseTimeMatch = stdout.match(/time[=<]\s?(\d+\.?\d*)\s?ms/);
            const responseTime = responseTimeMatch ? parseFloat(responseTimeMatch[1]) : 0;

            callback(true, responseTime);
        });
    }

    // Periodically write aggregated logs to the log file
    flushLogs() {
        const endOfInterval = new Date().toISOString();

        for (const server in this.aggregatedLogs) {
            const log = this.aggregatedLogs[server];
            const total = log.passed + log.failed;
            const successRate = total > 0 ? ((log.passed / total) * 100).toFixed(2) : "N/A";

            const message = `${server}: ${log.passed}/${log.failed} pass/fail (${successRate}%) between ${log.firstPingTime || "N/A"} and ${endOfInterval}. Avg response time: ${log.averageResponseTime} ms`;
            this.logMessage(message);

            // Reset the aggregated log for the server
            this.aggregatedLogs[server] = {
                passed: 0,
                failed: 0,
                firstPingTime: null,
                lastPingTime: null,
                averageResponseTime: 0,
                aggregateResponseTime: 0
            };
        }
    }

    // Log a message to the log file and console
    logMessage(message) {
        console.log(message); // Output to the console
        fs.appendFile(this.logFilePath, message + "\n", (err) => {
            if (err) {
                console.error("Error writing to the log file:", err);
            }
        });
    }

    // Start the flush countdown and log flushing
    startFlushCountdown() {
        setInterval(() => {
            if (this.countdown === 0) {
                // Clear the countdown line before flushing logs
                process.stdout.clearLine();
                process.stdout.cursorTo(0);

                // Flush logs when countdown reaches 0
                this.flushLogs();
                this.countdown = this.flushInterval; // Reset countdown
            } else {
                // Update the countdown in the console
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Time until next log flush: ${this.countdown}s`);
                this.countdown--;
            }
        }, 1000); // Update every second
    }

    // Start the monitoring process
    startMonitoring() {
        const startTime = new Date().toISOString();
        const startMessage = `Network monitor started at: ${startTime}`;
        this.logMessage(startMessage);

        // Schedule periodic pings
        setInterval(() => this.sendRequests(), this.requestInterval * 1000);

        // Start the flush countdown and log flushing
        this.startFlushCountdown();
    }
}

module.exports = NetworkMonitor;