const http = require("http");
const fs = require("fs");

const logFilePath = "events.log";

const addresses = {
    "google":"www.google.com", 
    "router":"192.168.0.1"};
const ports = {
    "google":"80",
    "router":"80"
}

let statuses = {
    "google":"0",
    "router":"0"
}

const indicators = ['-', '\\', '|', '/'];

let index = 0

function sendRequests() {
    for (const server in addresses) {
        const startTime = new Date();
        //console.log("Sending GET request to " + server + " via " + addresses[server] + " on port " + ports[server] + " at " + startTime);
        const req = http.get({
            hostname: addresses[server], 
            port: ports[server]
        },(res) => {
            // Callback function to handle the response
            let data = "";
        
            // A chunk of data has been received.
            res.on("data", (chunk) => {
                data += chunk;
            });
        
            // The whole response has been received.
            res.on("end", () => {
                //console.log("Response received from " + server + " with status " + res.statusCode + " at " + resTime);
                if(statuses[server] != res.statusCode){
                    resTime = new Date();
                    msg = "Status of " + server + " changed from " + statuses[server] + " to " + res.statusCode + " at " + resTime;
                    console.log(msg);
                    fs.appendFile(logFilePath, msg + "\n", (err) => {
                        if (err) {
                          console.error('Error writing to the log file:', err);
                        } else {
                          console.log('Event logged to', logFilePath);
                        }
                    });
                    statuses[server] = res.statusCode;
                }
            });
        });
        
        // Handle errors
        req.on("error", (error) => {
            console.error("Error sending GET request to " + server + " via " + addresses[server] + " on port " + ports[server] + " at " + startTime);
            console.error("Error: " + error.message);
            statuses[server] = "error";
        });
    }
    if (index > 0 && index < 11) {
        process.stdout.write(".");
    } else {
        index = 1;
        process.stdout.write("\r                      \r")
    }
    index++;
}

const interval = setInterval(sendRequests,1000);
