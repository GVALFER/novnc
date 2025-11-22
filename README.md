# VNC WebSocket Proxy Server

A lightweight WebSocket-to-TCP proxy server for VNC connections. This allows web applications to connect to VNC servers through WebSockets.

## Features

- ✅ WebSocket to TCP proxy for VNC connections
- ✅ TypeScript support
- ✅ Docker containerization
- ✅ Health checks
- ✅ Clean logging
- ✅ Graceful shutdown
- ✅ Connection management

## Requirements

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)

## Quick Start with Docker

### 1. Build and Run

```bash
# Build and start the container
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 2. Test Connection

The server will be available at: `ws://localhost:3101/vnc`

Example WebSocket connection:
```
ws://localhost:3101/vnc?host=VNC_SERVER_IP&port=VNC_SERVER_PORT&service_id=optional_id
```

### 3. Stop Container

```bash
docker-compose down
```

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
# With auto-reload
npm run dev

# Or production mode
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3101` | WebSocket server port |
| `NODE_ENV` | `development` | Environment mode |

### URL Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `host` | ✅ | VNC server IP address |
| `port` | ✅ | VNC server port |
| `service_id` | ❌ | Optional identifier for logging |

## Usage Example

### React/JavaScript Client

```typescript
const vncUrl = `ws://localhost:3101/vnc?host=192.168.1.100&port=5900&service_id=vm-123`;

// Using react-vnc
<VncScreen
    url={vncUrl}
    rfbOptions={{
        credentials: {
            password: "your_vnc_password",
            username: "",
            target: "",
        },
    }}
    autoConnect={true}
    scaleViewport={true}
/>
```

### Direct WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3101/vnc?host=192.168.1.100&port=5900');

ws.onopen = () => {
    console.log('Connected to VNC proxy');
};

ws.onmessage = (event) => {
    // Handle VNC data
    console.log('Received VNC data:', event.data);
};
```

## Docker Commands

### Build Image

```bash
docker build -t vnc-proxy .
```

### Run Container

```bash
docker run -p 3101:3101 vnc-proxy
```

### View Logs

```bash
# Live logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Container Stats

```bash
docker stats vnc-websocket-proxy
```

## Logs

The server provides clean, essential logging:

```
VNC WebSocket server started on ws://localhost:3101/vnc
VNC connection: vm-123 -> 192.168.1.100:5900
Connected to VNC server 192.168.1.100:5900
Authentication successful for vm-123
WebSocket closed: vm-123
```

## Health Check

The container includes health checks accessible at:
- **Docker**: Automatic health monitoring
- **Manual**: `wget http://localhost:3101` (basic connectivity test)

## Troubleshooting

### Port Already in Use

```bash
# Kill process using port 3101
kill -9 $(lsof -ti:3101)

# Or use different port
PORT=3102 npm start
```

### Container Won't Start

```bash
# Check logs
docker-compose logs vnc-server

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### VNC Connection Issues

1. **Check VNC server is running** on target host:port
2. **Verify firewall rules** allow connections
3. **Test direct VNC connection** with desktop client first
4. **Check proxy logs** for connection errors

### Memory Issues

```bash
# Monitor container resource usage
docker stats vnc-websocket-proxy

# Limit memory usage in docker-compose.yml
services:
  vnc-server:
    deploy:
      resources:
        limits:
          memory: 512M
```

## Production Deployment

### Environment Variables

```bash
# .env file
NODE_ENV=production
PORT=3101
```

### Reverse Proxy (nginx)

```nginx
location /vnc {
    proxy_pass http://localhost:3101;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### SSL/TLS

For WSS (secure WebSocket), use a reverse proxy with SSL certificates:

```
wss://yourdomain.com/vnc?host=...&port=...
```

## Performance

- **Memory**: ~50-100MB per container
- **CPU**: Minimal overhead (proxy only)
- **Connections**: Handles multiple concurrent VNC sessions
- **Latency**: <5ms additional latency

## License

ISC License