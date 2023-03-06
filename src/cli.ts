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

const INPUT_EXTENSIONS = ['.md', '.markdown'];
const OUTPUT_EXTENSIONS = ['.code-snippets', '.json'];

const processFile = async (inputFile: string, outputFile: string) => {
  let snippet;
  try {
    snippet = await markdownToSnippet(inputFile);
  } catch (e) {
    if (e instanceof KnownError) {
      exitError(e.toString());
    }
    console.error(
      chalkStderr.red`An unexpected error occurred while processing ${inputFile}`
    );
    console.error(
      chalkStderr.red(
        chalkTemplate`Please file an issue at {italic https://github.com/ZachGawlik/markdown-to-snippet/issues} with your markdown file's content`
      )
    );
    throw e;
  }

  try {
    await writeFile(outputFile, snippet as string);
    console.error(
      chalkStderr.green(
        chalkTemplate`${logSymbols.success} Snippets have been written to {italic ${outputFile}}`
      )
    );
  } catch (e) {
    console.error(chalkStderr.red`Failed to write to file ${outputFile}`);
    throw e;
  }
};

program
  .arguments('<snippets.md> [generated-output.code-snippets]')
  .action(async function runMarkdownToSnippet() {
    const ioFiles = process.argv.slice(2);
    const inputFiles: string[] = [];
    let outputFiles: string[] = [];
    ioFiles.forEach((f) => {
      if (INPUT_EXTENSIONS.some((ext) => f.endsWith(ext))) {
        inputFiles.push(f);
      } else if (OUTPUT_EXTENSIONS.some((ext) => f.endsWith(ext))) {
        outputFiles.push(f);
      } else {
        const outputMsg = chalkTemplate` or an output {bold .code-snippets or .json} file`;
        exitError(
          chalkTemplate`Expected {italic ${f}} to be a {bold .md or .markdown} file` +
            (inputFiles.length > 0 ? outputMsg : '')
        );
      }
    });
    if (outputFiles.length > 0 && outputFiles.length !== inputFiles.length) {
      exitError(
        chalkTemplate`When supplying output files, you must supply one for each input file`
      );
    } else if (outputFiles.length === 0) {
      outputFiles = inputFiles.map((f) =>
        f.replace(/\.(md|markdown)$/, '.code-snippets')
      );
    }

    // default outputFile name... pwd or same dir as input?
    await Promise.all(
      inputFiles.map(async (inputFile, i) => {
        processFile(inputFile, outputFiles[i]);
      })
    );
  });

if (process.argv.length === 2) {
  program.help();
} else {
  program.parseAsync(process.argv);
}
