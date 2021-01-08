
export interface SNode<T> {
  parent?: SNode<T>;
  label: string;
  source?: T[];
  children?: SNode<T>[];
  posBegin?: string;
  posEnd?: string;
}

export interface AST<T> {
  root: SNode<T>;
  errors: string[];
}

export abstract class SourceArray<T> {
  abstract split(terminal: string): T[];
  abstract match(char: T, elem: T): boolean;
  abstract elementAt(pos: number): T;
  abstract size(): number;
  abstract position(pos: number): string;
  abstract display(elem: T): string;
}

const listA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const listW = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const listD = '0123456789';
const listS = '\f\n\r\t\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

export class StringArray extends SourceArray<string> {

  private source: string;
  private linePos: number[];

  constructor(source: string) {
    super();
    // normalize
    const text = this.replaceAll(source, '\r\n', '\n');
    this.source = this.replaceAll(text, '\r', '\n');
    const lines = this.source.split('\n');
    this.linePos = [];
    this.linePos.push(0);
    for (let ln of lines) {
      this.linePos.push(this.linePos[this.linePos.length - 1] + ln.length);
    }
  }

  private replaceAll(str: string, src: string, dst: string): string {
    return str.split(src).join(dst);
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

  match(term: string, elem: string): boolean {
    switch(term) {
      case '\\t': return elem === '\t';
      case '\\n': return elem === '\n';
      case '\\N': return elem !== '\n';
      case '\\a': return listA.includes(elem);
      case '\\A': return !listA.includes(elem);
      case '\\w': return listW.includes(elem);
      case '\\W': return !listW.includes(elem);
      case '\\s': return listS.includes(elem);
      case '\\S': return !listS.includes(elem);
      case '\\d': return listD.includes(elem);
      case '\\D': return !listD.includes(elem);
      default: return term === elem;
    }
  }

  elementAt(pos: number): string {
    return this.source[pos];
  }

  size(): number {
    return this.source.length;
  }

  position(index) {
    let line = 0;
    let column = 0;
    for (let ln=0; ln<this.linePos.length; ++ln) {
      if (index >= this.linePos[ln]) {
        line = ln+1;
        column = index - this.linePos[ln] + 1;
      } else {
        break;
      }
    }
    return `${line}:${column}`;
  }

  display(elem) {
    return elem;
  }
}