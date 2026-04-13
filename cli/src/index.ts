#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { shellCommand } from './commands/shell';

const program = new Command();

program
  .name('shield')
  .description('SHIELD Developer CLI - Create and manage secure content policies')
  .version('0.1.0');

// Parse to handle --version and --help
program.parse(process.argv);

// Always launch the shell
shellCommand();
