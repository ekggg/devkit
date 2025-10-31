#!/usr/bin/env bun

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { dev } from './dev'
import { sync } from './sync'

yargs(hideBin(process.argv))
  .command(
    'dev [dir]',
    'Runs the EKG devkit, watching for changes',
    (yargs) => yargs.positional('dir', { type: 'string', describe: 'Folder to watch', default: '.' }),
    ({ dir }) => dev(dir),
  )
  .command(
    'sync [dir]',
    'Regenerates the EKG types',
    (yargs) =>
      yargs
        .positional('dir', { type: 'string', describe: 'Folder to watch', default: '.' })
        .option('force', { alias: 'f', type: 'boolean', description: 'Force downloading types and devkit binary from EKG servers' }),
    ({ dir, force }) => sync(dir, force),
  )
  .demandCommand()
  .help()
  .parse()
