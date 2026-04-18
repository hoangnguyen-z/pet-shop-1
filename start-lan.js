const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const workspaceRoot = __dirname;
const frontendPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 5500);
const backendPort = Number(process.env.BACKEND_PORT || process.env.API_PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const nodeExecutable = process.execPath;

function getLanIpv4Addresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const entries of Object.values(interfaces)) {
        for (const entry of entries || []) {
            if (entry && entry.family === 'IPv4' && !entry.internal) {
                addresses.push(entry.address);
            }
        }
    }

    return Array.from(new Set(addresses));
}

function startProcess(label, scriptArgs, cwd, extraEnv) {
    const child = spawn(nodeExecutable, scriptArgs, {
        cwd,
        env: {
            ...process.env,
            ...extraEnv
        },
        stdio: ['inherit', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
        process.stdout.write(`[${label}] ${chunk}`);
    });

    child.stderr.on('data', (chunk) => {
        process.stderr.write(`[${label}] ${chunk}`);
    });

    child.on('exit', (code, signal) => {
        const suffix = signal ? `signal ${signal}` : `code ${code}`;
        console.log(`[${label}] exited with ${suffix}`);
    });

    return child;
}

const backend = startProcess(
    'backend',
    ['src/app.js'],
    path.join(workspaceRoot, 'backend'),
    {
        HOST: host,
        PORT: String(backendPort)
    }
);

const frontend = startProcess(
    'frontend',
    ['dev-static-server.js'],
    workspaceRoot,
    {
        HOST: host,
        PORT: String(frontendPort),
        API_PORT: String(backendPort)
    }
);

console.log('');
console.log('Pet Shop is starting in LAN mode.');
console.log(`Desktop: http://localhost:${frontendPort}/`);

for (const address of getLanIpv4Addresses()) {
    console.log(`Phone:   http://${address}:${frontendPort}/`);
}

console.log('');
console.log('Open the phone link while both devices are on the same Wi-Fi.');
console.log('Press Ctrl + C here to stop both frontend and backend.');

let shuttingDown = false;

function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of [frontend, backend]) {
        if (child && !child.killed) {
            child.kill();
        }
    }
}

process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
});
