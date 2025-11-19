#!/usr/bin/env node
import { Command } from 'commander';
import { generateClientId } from './lib/id.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();
program
  .option('--region <region>')
  .option('--format <format>')
  .option('--signed', 'include HMAC signature')
  .action((opts) => {
    const s = generateClientId({ region: opts.region, format: opts.format, signed: !!opts.signed }, process.env.HMAC_SECRET);
    console.log(s);
  });

program.parse(process.argv);
