/* eslint-disable @typescript-eslint/no-explicit-any */
export class KnownError extends Error {
  extra?: any;
  constructor(message: string, extra?: any) {
    super(message);
    this.name = this.constructor.name;
    this.extra = extra;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class FileDoesNotExist extends KnownError {}

export class MarkdownParsingError extends KnownError {}

export class UserInputError extends KnownError {}
