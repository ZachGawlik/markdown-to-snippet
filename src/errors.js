export class KnownError extends Error {
  constructor(message, extra) {
    super(message);
    this.name = this.constructor.name;
    this.extra = extra;
  }
}

export class FileDoesNotExist extends KnownError {}

export class MarkdownParsingError extends KnownError {}

export class UserInputError extends KnownError {}
