const { markdownToSnippet } = require('../');
const { readdirSync } = require('fs');
const { readFile } = require('fs/promises');
const path = require('path');

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
