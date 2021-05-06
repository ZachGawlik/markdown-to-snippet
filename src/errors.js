class KnownError extends Error {
  constructor(message, extra) {
    super(message);
    this.name = this.constructor.name;
    this.extra = extra;
  }
}

class FileDoesNotExist extends KnownError {
  toString() {
    return `${this.message} ${this.extra.filepath}`;
  }
}

module.exports = {
  KnownError,
  FileDoesNotExist,
};
