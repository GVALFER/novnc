import WebSocket, { WebSocketServer } from "ws";
import net from "node:net";
import { exec } from "node:child_process";
import { IncomingMessage } from "node:http";

interface VNCConnection {
    ws: WebSocket;
    tcp: net.Socket;
}

const PORT = 3101;

// Global variables for cleanup
let wss: WebSocketServer | null = null;
const activeConnections = new Map<string, VNCConnection>();

// Initialize server
const initServer = (): void => {
    wss = new WebSocketServer({
        port: PORT,
        path: "/vnc",
    });

    console.log(`VNC WebSocket server started on ws://localhost:${PORT}/vnc`);
    startServer(wss);
};

// Start the WebSocket server
const startServer = (server: WebSocketServer): void => {
    server.on("connection", (ws: WebSocket, request: IncomingMessage) => {
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const host = url.searchParams.get("host");
        const port = url.searchParams.get("port");
        const serviceId = url.searchParams.get("service_id") || "unknown";

        if (!host || !port) {
            console.error("Missing host or port parameters");
            ws.close(1008, "Missing host or port parameters");
            return;
        }

        console.log(`VNC connection: ${serviceId} -> ${host}:${port}`);

        const tcpSocket = new net.Socket();
        const connectionId = `${serviceId}-${Date.now()}`;
        activeConnections.set(connectionId, { ws, tcp: tcpSocket });

        // Connect to VNC server
        tcpSocket.connect(parseInt(port), host, () => {
            console.log(`Connected to VNC server ${host}:${port}`);
        });

        // Forward data bidirectionally
        let authComplete = false;
        ws.on("message", (data: WebSocket.Data) => {
            if (tcpSocket.writable) {
                tcpSocket.write(data as Buffer);
            }
        });

        tcpSocket.on("data", (data: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
                // Check for auth success (only once)
                if (!authComplete && data.length === 4 && data.readUInt32BE(0) === 0) {
                    console.log(`Authentication successful for ${serviceId}`);
                    authComplete = true;
                }
                ws.send(data);
            }
        });

        // Handle connection events
        ws.on("close", () => {
            console.log(`WebSocket closed: ${serviceId}`);
            tcpSocket.destroy();
            activeConnections.delete(connectionId);
        });

        ws.on("error", (error: Error) => {
            console.error(`WebSocket error (${serviceId}): ${error.message}`);
            tcpSocket.destroy();
            activeConnections.delete(connectionId);
        });

        tcpSocket.on("close", (hadError: boolean) => {
            if (hadError) {
                console.log(`TCP connection closed with error: ${serviceId}`);
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, "VNC server disconnected");
            }
            activeConnections.delete(connectionId);
        });

        tcpSocket.on("error", (error: Error) => {
            console.error(`TCP error (${serviceId}): ${error.message}`);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1011, "VNC server connection error");
            }
            activeConnections.delete(connectionId);
        });

        tcpSocket.setTimeout(30000, () => {
            console.log(`Connection timeout: ${serviceId}`);
            tcpSocket.destroy();
        });
    });

    server.on("error", (error: Error) => {
        console.error("WebSocket server error:", error);
    });
};

// Cleanup on process exit
const cleanup = (): void => {
    console.log("Shutting down VNC server...");

    // Close all active connections
    activeConnections.forEach(({ ws, tcp }, connectionId) => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            tcp.destroy();
        } catch (error) {
            console.error(`Error closing connection ${connectionId}:`, (error as Error).message);
        }
    });
    activeConnections.clear();

    // Close WebSocket server
    if (wss) {
        wss.close(() => {
            console.log("VNC server closed");
            process.exit(0);
        });

        setTimeout(() => {
            process.exit(1);
        }, 3000);
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGQUIT", cleanup);
process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    cleanup();
});

// Start the server
try {
    initServer();
} catch (error) {
    console.error("Failed to start VNC server:", error);
    process.exit(1);
}
