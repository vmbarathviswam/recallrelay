import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const config = 'wrangler.local.jsonc';
const source = await readFile(config, 'utf8');
if (source.includes('REPLACE_WITH_')) throw new Error('Complete wrangler.local.jsonc before uploading secrets.');
const names = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'GEMINI_API_KEY', 'ADMIN_TOKEN'];
if (names.some(name => !process.env[name]) || process.env.ADMIN_TOKEN.length < 32) throw new Error('Configure the required local .env values first.');
const secrets = Object.fromEntries(names.map(name => [name, process.env[name]]));
if (process.env.PAYPAL_WEBHOOK_ID) secrets.PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
// Credentials travel only through the child process stdin, never argv or a file.
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk', '--config', config], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true });
child.stdin.end(JSON.stringify(secrets));
child.on('error', () => { console.error('Could not start the official Cloudflare CLI.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
