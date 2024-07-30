const http = require("http");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

const logFilePath = "events.log";

const addresses = {
    "google":"www.google.com", 
    "router":"192.168.0.1"};

let statuses = {
    "google":"0",
    "router":"0"
}

const indicators = ['-', '\\', '|', '/'];

let index = 0

function sendRequests() {
    for (const server in addresses) {
        const startTime = new Date();
        pingAddress(addresses[server], (success) => {
            if (success) {
                newStatus = "success";
                if (statuses[server] != newStatus) {
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    //console.log(`New Success pinging ${server} at ${new Date()}`);
                    logEvent({server: server, oldStatus: statuses[server], newStatus: newStatus});
                }
                statuses[server] = "success";
            } else {
                newStatus = "error";
                if (statuses[server] != newStatus) {
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    //console.log(`New Error pinging ${server} at ${new Date()}`);
                    logEvent({server: server, oldStatus: statuses[server], newStatus: newStatus});
                }
                statuses[server] = "error";
            }
        });
    }
    if (index > 0 && index < 11) {
        process.stdout.write(".");
    } else {
        index = 1;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
    }
    index++;
}

function pingAddress(address, callback) {
    // Determine the ping command based on the operating system
    const pingCmd = os.platform() === "win32" ? `ping -n 1 ${address} > nul` : `ping -c 1 ${address} > /dev/null`;

    exec(pingCmd, (error, stdout, stderr) => {
        if (error || stderr) {
            callback(false);
            return;
        }
        callback(true);
    });
}

function logEvent(event) {
    resTime = new Date();
    msg = "\rStatus of " + event.server + " changed from " + event.oldStatus + " to " + event.newStatus + " at " + resTime;
    console.log(msg);
    fs.appendFile(logFilePath, msg + "\n", (err) => {
        if (err) {
            console.error('\rError writing to the log file:', err);
        } else {
            //console.log('\rEvent logged to', logFilePath);
        }
    });
}

const interval = setInterval(sendRequests,1000);
