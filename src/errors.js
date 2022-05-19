export class KnownError extends Error {
  constructor(message, extra) {
    super(message);
    this.name = this.constructor.name;
    this.extra = extra;
  }
}

export class FileDoesNotExist extends KnownError {
  toString() {
    return `${this.message} ${this.extra.filepath}`;
  }
}

export class MarkdownParsingError extends KnownError {
  toString() {
    return `${this.message}\n${this.extra?.snippet}`;
  }
}

export class UserInputError extends KnownError {
  toString() {
    return `${this.message}`;
  }
}
