import { AST, SNode, SourceArray } from './type';
import { eebnfSchema, MetaType, MetaVal, Meta } from './schema';

interface Stack<T> {
  meta: MetaVal;
  state: any;
  result: MatchResult<T>;
  pos: number;
}

enum MatchCode {
  NONE = 0,
  ACCEPT,
  REJECT,
}

interface MatchResult<T> {
  code: MatchCode;
  complete: SNode<T> | null;
  stop?: boolean;
}

function accept<T>(): MatchResult<T> {
  return {
    code: MatchCode.ACCEPT,
    complete: null,
  };
}

function acceptComplete<T>(node: SNode<T>): MatchResult<T> {
  return {
    code: MatchCode.ACCEPT,
    complete: node,
  };
}

function none<T>(): MatchResult<T> {
  return {
    code: MatchCode.NONE,
    complete: null,
  };
}

function noneComplete<T>(node: SNode<T>): MatchResult<T> {
  return {
    code: MatchCode.NONE,
    complete: node,
  };
}

function reject<T>(): MatchResult<T> {
  return {
    code: MatchCode.REJECT,
    complete: null,
  };
}

function rejectComplete<T>(node: SNode<T>): MatchResult<T> {
  return {
    code: MatchCode.REJECT,
    complete: node,
  };
}

export class Parser<T> {

  static fromSourceArray<T>(array: SourceArray<T>) {
    return new Parser<T>(array);
  }

  private array: SourceArray<T>;
  private metaMatch: Map<MetaType, (context: Stack<T>, elem: T) => MatchResult<T>>;

  constructor(array: SourceArray<T>) {
    this.array = array;
    this.metaMatch = new Map();
    this.metaMatch.set(MetaType.GROUPING, this.matchGrouping);
    this.metaMatch.set(MetaType.NONTERMINAL, this.matchNonTerminal);
    this.metaMatch.set(MetaType.ALTERNATION, this.matchAlternation);
    this.metaMatch.set(MetaType.OPTIONAL, this.matchOptional);
    this.metaMatch.set(MetaType.REPETITION, this.matchRepetition);
  }

  private out: string[];
  private pos: number;
  private stack: Stack<T>[];
  private stopFlag: boolean;

  private pushMeta(meta: MetaVal, pos: number) {
    this.stack.push({
      meta,
      pos,
      state: null,
      result: null,
    });
  }

  private popMeta(result: MatchResult<T>) {
    this.stack.pop();
    const top = this.peek();
    if (top) {
      top.result = result;
    }
  }

  private peek(): Stack<T> | undefined {
    if (this.stack.length > 0) {
      return this.stack[this.stack.length - 1];
    } else {
      return undefined;
    }
  }

  private error(str: string) {
    this.out.push(`[error] ${str} @ ${this.array.position(this.pos)}`);
  }

  init() {
    this.out = [];
    this.pos = -1;
    this.stack = [];
    this.stopFlag = false;
    this.pushMeta(eebnfSchema['ENTRY'], 0);
  }

  step(): boolean {
    this.pos++;
    if (this.pos >= this.array.size()) {
      this.stopFlag = true;
      return this.stopFlag;
    }
    const elem = this.array.elementAt(this.pos);
    const stack = this.peek();
    if (stack) {
      let result: MatchResult<T> = null;
      if (typeof stack.meta === 'string') {
        result = this.matchStr(stack, elem);
      } else {
        result = this.metaMatch.get(stack.meta.type).call(this, stack, elem);
      }
      if (result) {
        console.log(`${this.pos}: ${elem} ==> ${strMetaVal(stack.meta)} ==> ${strResult(result)}`)
        switch(result.code) {
          case MatchCode.NONE: {
            this.pos--;
          } break;
          case MatchCode.ACCEPT: {
            // do nothing now
          } break;
          case MatchCode.REJECT: {
            this.pos = stack.pos - 1;
            this.popMeta(result);
          } break;
        }
        if (result.complete) {
          this.popMeta(result);
        }
        if (result.stop) {
          this.stopFlag = true;
        }
      } else {
        this.error('internal: match result is unknown');
      }
    } else {
      this.error(`expected file ending, got: ${this.array.display(elem)}`);
    }
    return this.stopFlag;
  }

  finish(): AST<T> {
    return null;
  }

  exec(): AST<T> {
    this.init();
    while(!this.stopFlag) {
      this.step();
    }
    return this.finish();
  }

  private matchStr(context: Stack<T>, elem: T): MatchResult<T> {
    let state: {
      index: number;
      terms: T[];
      source: T[];
    } = context.state;
    if (state == null) {
      state = {
        index: 0,
        terms: this.array.split(context.meta as string),
        source: [],
      };
      context.state = state;
    }
    const term = state.terms[state.index];
    state.index++;
    if (this.array.match(term, elem)) {
      state.source.push(elem);
      if (state.index >= state.terms.length) {
        return acceptComplete({
          label: this.array.display(term),
          source: state.source, 
        });
      } else {
        return accept();
      }
    } else {
      return reject();
    }
  }

  private matchNonTerminal(context: Stack<T>, elem: T): MatchResult<T> {
    let state: boolean = context.state;
    const nterm = (context.meta as Meta).value as string;
    if (state == null) {
      context.state = true;
      let newMeta = eebnfSchema[nterm];
      this.pushMeta(newMeta, this.pos);
      return none();
    } else {
      if (context.result.complete) {
        return noneComplete({
          label: nterm,
          children: [context.result.complete],
        });
      }
      return context.result;
    }
  }

  private matchAlternation(context: Stack<T>, elem: T): MatchResult<T> {
    let state: {
      index: number;
    } = context.state;
    const metaVals = (context.meta as Meta).value as MetaVal[];
    if (state == null) {
      state = {
        index: 0,
      };
      context.state = state;
      this.pushMeta(metaVals[0], this.pos);
      state.index++;
      return none();
    } else {
      if (context.result.complete) {
        return acceptComplete(context.result.complete);
      } else {
        if (state.index < metaVals.length) {
          let nextMeta = metaVals[state.index];
          this.pushMeta(nextMeta, this.pos);
          state.index++;
          return none();
        } else {
          return reject();
        }
      }
    }
  }

  private matchOptional(context: Stack<T>, elem: T): MatchResult<T> {
    let state: boolean = context.state;
    const metaVals = (context.meta as Meta).value as MetaVal[];
    if (state == null) {
      state = true;
      context.state = state;
      this.pushMeta(metaVals[0], this.pos);
      return none();
    } else {
      if (context.result.complete) {
        return noneComplete(context.result.complete);
      } else {
        return none();
      }
    }
  }

  private matchRepetition(context: Stack<T>, elem: T): MatchResult<T> {
    let state: {
      children: SNode<T>[];
    } = context.state;
    const metaVals = (context.meta as Meta).value as MetaVal[];
    if (state == null) {
      state = {
        children: [],
      };
      context.state = state;
      this.pushMeta(metaVals[0], this.pos);
      return none();
    } else {
      if (context.result.complete) {
        state.children.push(context.result.complete);
      }
      if (context.result.code === MatchCode.REJECT) {
        if (state.children.length > 0) {
          return rejectComplete({
            label: 'repetition',
            children: state.children,
          });
        }
      } else {
        this.pushMeta(metaVals[0], this.pos);
        return none();
      }
    }
  }

  private matchGrouping(context: Stack<T>, elem: T): MatchResult<T> {
    let state: {
      index: number;
      children: SNode<T>[];
    } = context.state;
    const metaVals = (context.meta as Meta).value as MetaVal[];
    if (state == null) {
      state = {
        index: 0,
        children: [],
      };
      context.state = state;
      this.pushMeta(metaVals[0], this.pos);
      state.index++;
      return none();
    } else {
      if (context.result.complete) {
        state.children.push(context.result.complete);
      }
      if (context.result.code !== MatchCode.REJECT) {
        if (state.index < metaVals.length) {
          let nextMeta = metaVals[state.index];
          this.pushMeta(nextMeta, this.pos);
          state.index++;
          return none();
        } else {
          return acceptComplete({
            label: 'grouping',
            children: state.children,
          });
        }
      } else {
        return reject();
      }
    }
  }
}

// debug code
function strMetaVal(meta: MetaVal): string {
  if (typeof meta === 'string') {
    return `"${meta}"`;
  } else {
    let children: string;
    if (Array.isArray(meta.value)) {
      let chs = meta.value.map(e => `[${strMetaVal(e)}]`);
      children = chs.join(',');
    } else {
      return strMetaVal(meta.value);
    }
    return `${MetaType[meta.type]}={${children}}`;
  }
}

function strResult<T>(res: MatchResult<T>): string {
  if (res) {
    return `{${MatchCode[res.code]}:${JSON.stringify(res.complete)}}`
  } else {
    return 'null';
  }
}