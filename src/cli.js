#!/usr/bin/env node
/* eslint-disable no-console */

import { constants as FS_MODES } from 'fs';
import { access, writeFile as _writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { stderr } from 'chalk';
import { program } from 'commander';
import { error, success } from 'log-symbols';
import { markdownToSnippet } from './';
import { KnownError } from './errors';

const pathExists = (file, mode) =>
  access(file, mode)
    .then(() => true)
    .catch(() => false);

const exitError = (errorString) => {
  console.error(stderr`{red ${error} ${errorString.trim()}}`);
  process.exit(1);
};

// Write file, creating one intermediate directory if necessary
const writeFile = (filepath, data) =>
  _writeFile(filepath, data).catch(async (err) => {
    if (
      err.code === 'ENOENT' &&
      (await pathExists(dirname(dirname(filepath), FS_MODES.W_OK)))
    ) {
      await mkdir(dirname(filepath));
      return _writeFile(filepath, data);
    }
    throw err;
  });

program
  .arguments('<snippets.md> [destination.json]')
  .action(async function runMarkdownToSnippet(inputFile, outputFile) {
    if (!['.md', '.markdown'].some((ext) => inputFile.endsWith(ext))) {
      exitError(stderr`Expected {italic ${inputFile}} to be a {bold .md} file`);
    }

    let snippet;
    try {
      snippet = await markdownToSnippet(inputFile);
    } catch (e) {
      if (e instanceof KnownError) {
        exitError(stderr`${e}`);
      }
      console.error(
        stderr`An error was encountered when parsing the markdown file`
      );
      throw new Error(e);
    }

    if (!outputFile) {
      // If no outputFile, print json to stdout to be redirected
      console.log(snippet);
      return;
    }

    if (!outputFile.endsWith('.json')) {
      exitError(
        stderr`Expected {italic ${outputFile}} to be a {bold .json} file`
      );
    }

    try {
      writeFile(outputFile, snippet);
      console.log(
        stderr`
          {green ${success} Snippets have been written to {italic ${outputFile}}}
        `.trim()
      );
    } catch (err) {
      exitError(stderr`Failed to write to file ${err}`);
    }
  });

if (process.argv.length === 2) {
  program.help();
} else {
  program.parseAsync(process.argv);
}
