#!/usr/bin/env node
import { createDocsServer, ServeOptions } from './serve';

function parseArgs(argv: string[]): ServeOptions {
  const args = argv.slice(2);
  const options: ServeOptions = {
    port: 4040,
    format: 'json',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      const parsed = parseInt(args[++i], 10);
      if (!isNaN(parsed)) options.port = parsed;
    } else if (arg === '--yaml' || arg === '--format=yaml') {
      options.format = 'yaml';
    } else if (arg === '--json' || arg === '--format=json') {
      options.format = 'json';
    } else if (arg === '--title' && args[i + 1]) {
      options.info = { ...options.info, title: args[++i] };
    } else if (arg === '--version' && args[i + 1]) {
      options.info = { ...options.info, version: args[++i] };
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
routewatch - OpenAPI docs from runtime traffic

Usage: routewatch [options]

Options:
  --port, -p <number>   Port to serve docs on (default: 4040)
  --yaml                Serve docs in YAML format
  --json                Serve docs in JSON format (default)
  --title <string>      API title
  --version <string>    API version
  --help, -h            Show this help message
`);
}

const options = parseArgs(process.argv);
createDocsServer(options);
