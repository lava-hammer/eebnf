
export abstract class SourceArray<T_Element, T_Terminal> {
  abstract split(terminal: string): T_Terminal[];
  abstract match(char: T_Terminal, elem: T_Element): boolean;
  abstract elementAt(pos: number): T_Element;
  abstract size(): number;
  abstract position(pos: number): string;
  abstract display(elem: T_Element): string;
}

export class StringArray extends SourceArray<string, string> {

  private source: string;

  constructor(source: string) {
    super();
    this.source = source;
  }

  split(terminal: string): string[] {
    const ret: string[] = [];
    for (let i=0; i<terminal.length; ++i) {
      let ch = terminal[i];
      if (ch === '\\' && i < terminal.length - 1) {
        let next = terminal[i + 1];
        switch (next) {
          case '\\': {
            ch = '\\';
          } break;
          case '"': {
            ch = '"';
          } break;
          default: {
            ch += next;
          }
        }
        i++;
      }
      ret.push(ch);
    }
    return ret;
  }

  match(char: string, elem: string) {
    // todo:
    return true;
  }

  elementAt(pos: number): string {
    return this.source[pos];
  }

  size(): number {
    return this.source.length;
  }

  position(index) {
    return '';
  }

  display(elem) {
    return elem;
  }
}