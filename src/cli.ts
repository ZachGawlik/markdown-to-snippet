#!/usr/bin/env node
/* eslint-disable no-console */

import { constants as FS_MODES } from 'fs';
import { access, writeFile as _writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalkTemplate from 'chalk-template';
import { chalkStderr } from 'chalk';
import { program } from 'commander';
import logSymbols from 'log-symbols';
import { markdownToSnippet } from './index.js';
import { KnownError } from './errors.js';

const pathExists = (file: string, mode: number) =>
  access(file, mode)
    .then(() => true)
    .catch(() => false);

const exitError = (errorString: string) => {
  console.error(chalkStderr.red(`${logSymbols.error} ${errorString.trim()}`));
  process.exit(1);
};

// Write file, creating one intermediate directory if necessary
const writeFile = (filepath: string, data: string) =>
  _writeFile(filepath, data).catch(async (err) => {
    if (
      err.code === 'ENOENT' &&
      (await pathExists(dirname(dirname(filepath)), FS_MODES.W_OK))
    ) {
      await mkdir(dirname(filepath));
      return _writeFile(filepath, data);
    }
    throw err;
  });

program
  .arguments('<snippets.md> [generated-output.code-snippet]')
  .action(async function runMarkdownToSnippet(inputFile, outputFile) {
    if (!['.md', '.markdown'].some((ext) => inputFile.endsWith(ext))) {
      exitError(
        chalkTemplate`Expected {italic ${inputFile}} to be a {bold .md} file`
      );
    }

    let snippet;
    try {
      snippet = await markdownToSnippet(inputFile);
    } catch (e) {
      if (e instanceof KnownError) {
        exitError(e.toString());
      }
      console.error(
        chalkStderr.red`An unexpected error occurred while processing your markdown file.`
      );
      console.error(
        chalkStderr.red(
          chalkTemplate`Please file an issue at {italic https://github.com/ZachGawlik/markdown-to-snippet/issues} with your markdown file's content`
        )
      );
      if (e instanceof Error) {
        throw e;
      }
    }

    if (!outputFile) {
      // If no outputFile, print json to stdout to be redirected
      console.log(snippet);
      return;
    }

    if (
      !outputFile.endsWith('.json') &&
      !outputFile.endsWith('.code-snippets')
    ) {
      exitError(
        chalkTemplate`Expected {italic ${outputFile}} to be a {underline .json} or {underline .code-snippets} file`
      );
    }

    try {
      writeFile(outputFile, snippet as string);
      console.error(
        chalkStderr.green(
          chalkTemplate`${logSymbols.success} Snippets have been written to {italic ${outputFile}}`
        )
      );
    } catch (err) {
      exitError(`Failed to write to file ${err}`);
    }
  });

if (process.argv.length === 2) {
  program.help();
} else {
  program.parseAsync(process.argv);
}
