#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { dev } from './dev'
import { sync } from './sync'

yargs(hideBin(process.argv))
  .command(
    'dev [dir]',
    'Runs the EKG devkit, watching for changes',
    (yargs) =>
      yargs
        .positional('dir', { type: 'string', describe: 'Folder to watch', default: '.' })
        .option('dev', { alias: 'd', type: 'boolean', description: 'Internal option when developing the EKG CLI', hidden: true }),
    (o) => dev(o.dir, o.dev ?? false),
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
