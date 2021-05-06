#!/usr/bin/env node
/* eslint-disable no-console */

const { constants: FS_MODES } = require('fs');
const fs = require('fs/promises');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const logSymbols = require('log-symbols');
const { markdownToSnippet } = require('./');
const Errors = require('./errors');

const pathExists = (file, mode) =>
  fs
    .access(file, mode)
    .then(() => true)
    .catch(() => false);

const exitError = (errorString) => {
  console.error(chalk.stderr`{red ${logSymbols.error} ${errorString.trim()}}`);
  process.exit(1);
};

// Write file, creating one intermediate directory if necessary
const writeFile = (filepath, data) =>
  fs.writeFile(filepath, data).catch(async (err) => {
    if (
      err.code === 'ENOENT' &&
      (await pathExists(path.dirname(path.dirname(filepath), FS_MODES.W_OK)))
    ) {
      await fs.mkdir(path.dirname(filepath));
      return fs.writeFile(filepath, data);
    }
    throw err;
  });

program
  .arguments('<snippets.md> [destination.json]')
  .action(async function runMarkdownToSnippet(inputFile, outputFile) {
    if (!['.md', '.markdown'].some((ext) => inputFile.endsWith(ext))) {
      exitError(
        chalk.stderr`Expected {italic ${inputFile}} to be a {bold .md} file`
      );
    }

    let snippet;
    try {
      snippet = await markdownToSnippet(inputFile);
    } catch (e) {
      if (e instanceof Errors.FileDoesNotExist) {
        exitError(chalk.stderr`${e}`);
      }
      console.error(
        chalk.stderr`An error was encountered when parsing the markdown file`
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
        chalk.stderr`Expected {italic ${outputFile}} to be a {bold .json} file`
      );
    }

    try {
      writeFile(outputFile, snippet);
      console.log(
        chalk.stderr`
          {green ${logSymbols.success} Snippets have been written to {italic ${outputFile}}}
        `.trim()
      );
    } catch (err) {
      exitError(chalk.stderr`Failed to write to file ${err}`);
    }
  });

if (process.argv.length === 2) {
  program.help();
} else {
  program.parseAsync(process.argv);
}
