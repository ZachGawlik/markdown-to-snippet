import { markdownToSnippet } from '../index';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(__dirname, 'fixtures');

describe('Markdown to snippet', () => {
  const fixtureFilenames = readdirSync(root);
  const inputs = fixtureFilenames.filter((f) => f.includes('.md')).sort();
  const outputs = fixtureFilenames.filter((f) => f.includes('.json')).sort();

  if (inputs.length !== outputs.length) {
    throw new Error(
      'Each test fixture input .md file must have corresponding .json file'
    );
  }

  inputs.map((inputFile, index) => {
    test(`Fixture ${inputFile}`, async () => {
      const outputFile = outputs[index];
      if (
        outputFile.slice(0, -1 * '.json'.length) !==
        inputFile.slice(0, -1 * '.md'.length)
      ) {
        throw new Error(
          `Mismatched test input ${inputFile} to output ${outputs[index]}`
        );
      }

      const outputContent = await readFile(path.join(root, outputFile), 'utf8');
      const res = await markdownToSnippet(path.join(root, inputFile));
      expect(res).toEqual(outputContent);
    });
  });
});
