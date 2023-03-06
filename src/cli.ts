#!/usr/bin/env node
/* eslint-disable no-console */

import { writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import chalkTemplate from 'chalk-template';
import { chalkStderr } from 'chalk';
import { program } from 'commander';
import logSymbols from 'log-symbols';
import { markdownToSnippet } from './index.js';
import { KnownError } from './errors.js';

const exitError = (errorString: string) => {
  console.error(chalkStderr.red(`${logSymbols.error} ${errorString.trim()}`));
  process.exit(1);
};

const INPUT_EXTENSIONS = ['.md', '.markdown'];
const OUTPUT_EXTENSIONS = ['.code-snippets', '.json'];

const processFile = async (
  inputFile: string,
  outputFile: string,
  options: { print: boolean } = { print: false }
) => {
  let snippetOutput: string;
  try {
    snippetOutput = await markdownToSnippet(inputFile);
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

  if (options.print) {
    console.log(snippetOutput);
  } else {
    try {
      await writeFile(outputFile, snippetOutput);
    } catch (e) {
      console.error(chalkStderr.red`Failed to write to file ${outputFile}`);
      throw e;
    }
  }

  console.error(
    chalkStderr.green(
      chalkTemplate`${logSymbols.success} Snippets have been written to {italic ${outputFile}}`
    )
  );
};

program
  .arguments('<snippets.md> [generated-output.code-snippets]')
  .option(
    '-o, --output-dir <dir>',
    'output to dir from cwd instead of same dir as input file'
  )
  .option(
    '--output-json',
    'for automatic output filenames, use .json instead of .code-snippets'
  )
  .option(
    '-p, --print',
    'print the generated snippets instead of writing to file'
  )
  .action(async function runMarkdownToSnippet(...args) {
    const { outputJson, outputDir, print } = program.opts();
    const inputFiles: string[] = [];
    let outputFiles: string[] = [];
    args.forEach((f) => {
      if (typeof f !== 'string') {
        return; // options argument
      }
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
    if (outputFiles.length > 0) {
      if (outputFiles.length !== inputFiles.length) {
        exitError(
          chalkTemplate`When sending output filenames, you must supply one for each input file`
        );
      } else if (print) {
        exitError(
          chalkTemplate`When sending --print, you must not supply output filenames`
        );
      }
    } else if (outputFiles.length === 0 && !print) {
      outputFiles = inputFiles.map((f) => {
        const parsedInputPath = path.parse(f);
        return path.format({
          dir: outputDir ?? parsedInputPath.dir,
          name: parsedInputPath.name,
          ext: outputJson ? '.json' : '.code-snippets',
        });
      });
    }
    if (outputDir) {
      await mkdir(outputDir, { recursive: true });
    }

    // default outputFile name... pwd or same dir as input?
    await Promise.all(
      inputFiles.map(async (inputFile, i) => {
        processFile(inputFile, outputFiles[i], { print });
      })
    );
  });

if (process.argv.length === 2) {
  program.help();
} else {
  program.parseAsync(process.argv);
}
