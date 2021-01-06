
export abstract class SourceArray<T> {
  abstract elementAt(pos: number): T;
  abstract size(): number;
  abstract match(char: string, elem: T): boolean;
  abstract position(pos: number): string;
  abstract display(elem: T): string;
}

export class StringArray extends SourceArray<string> {

  private source: string;

  constructor(source: string) {
    super();
    this.source = source;
  }

  elementAt(index) {
    return this.source[index];
  }

  size() {
    return this.source.length;
  }

  match(terminal, element) {
    // todo:
    return true;
  }

  position(index) {
    return '';
  }

  display(elem) {
    return elem;
  }
}