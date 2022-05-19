import { markdownToSnippet } from '../index';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(__dirname, 'fixtures');

describe('Markdown to snippet', () => {
  describe('Successful conversions', () => {
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

        const outputContent = await readFile(
          path.join(root, outputFile),
          'utf8'
        );
        const res = await markdownToSnippet(path.join(root, inputFile));
        expect(res).toEqual(outputContent);
      });
    });
  });

  describe('Errors', () => {
    const errorFile = (filename) =>
      path.join(__dirname, 'error-fixtures', filename);
    test('Input file does not exist', async () => {
      await expect(() =>
        markdownToSnippet(errorFile('nonsense-non-existing-md-file.md'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"File does not exist"`);
    });
    test("Can't find heading - double code", async () => {
      await expect(() =>
        markdownToSnippet(errorFile('cant-find-heading-double-code.md'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Could not find heading for snippet"`
      );
    });
    test("Can't find heading - none", async () => {
      await expect(() =>
        markdownToSnippet(errorFile('cant-find-heading-none.md'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Could not find heading for snippet"`
      );
    });
    test('Duplicated scopes, one global', async () => {
      await expect(() =>
        markdownToSnippet(errorFile('duplicated-scopes-global.md'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Prefix usr is defined both globally and for scopes typescript, typescriptreact"`
      );
    });
    test('Duplicated scopes, named', async () => {
      await expect(() =>
        markdownToSnippet(errorFile('duplicated-scopes-named.md'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Prefix usr is defined multiple times for scope typescript, typescriptreact"`
      );
    });
  });
});
