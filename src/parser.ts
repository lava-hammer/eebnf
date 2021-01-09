import { AST, SNode, SourceArray } from './type';
import { eebnfSchema, MetaType, MetaVal, Meta } from './schema';

interface Stack<T> {
  meta: MetaVal;
  state: any;
  result: MatchResult<T>;
  pos: number;
}

enum Flow {
  CONTINUE,
  RETURN,
  BACK,
}

interface MatchResult<T> {
  accept: boolean;
  flow: Flow;
  return?: SNode<T>;
}

function acceptReturn<T>(ret: SNode<T>) {
  return {
    accept: true,
    flow: Flow.RETURN,
    return: ret,
  }
}

function acceptContinue() {
  return {
    accept: true,
    flow: Flow.CONTINUE,
  }
}

function rejectReturn<T>(ret: SNode<T>) {
  return {
    accept: false,
    flow: Flow.RETURN,
    return: ret,
  }
}

function rejectBack() {
  return {
    accept: false,
    flow: Flow.BACK,
  }
}

function newStack() {
  return {
    accept: false,
    flow: Flow.CONTINUE,
  }
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
  private stepCount: number;

  private pushMeta(meta: MetaVal, pos: number) {
    console.log(`=== PUSH META=${strMetaVal(meta)}`);
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

  private error(str: string, isSchema?: boolean) {
    let msg: string;
    if (isSchema) {
      msg = `[schema error] ${str}`;
    } else {
      msg = `[error] ${str} @ ${this.array.position(this.pos)}`;
    }
    console.log(msg);
    this.out.push(msg);
  }

  init() {
    this.out = [];
    this.pos = -1;
    this.stack = [];
    this.stopFlag = false;
    this.stepCount = 0;
    this.pushMeta(eebnfSchema['ENTRY'], 0);
  }

  step(): boolean {
    this.stepCount++;
    this.pos++;
    if (this.pos >= this.array.size()) {
      this.stopFlag = true;
      return this.stopFlag;
    }
    const elem = this.array.elementAt(this.pos);
    const stack = this.peek();
    if (stack) {
      let result: MatchResult<T> = null;
      console.log(`[${this.stepCount}] ${this.pos}: ${elem} ==> ${strMetaVal(stack.meta)}`);
      if (typeof stack.meta === 'string') {
        result = this.matchStr(stack, elem);
      } else {
        result = this.metaMatch.get(stack.meta.type).call(this, stack, elem);
      }
      if (result) {
        console.log(`>>> ${strResult(result)}`)
        if (!result.accept) {
          this.pos--;
        }
        switch(result.flow) {
          case Flow.CONTINUE: {
            // do nothing
          } break;
          case Flow.RETURN: {
            this.popMeta(result);
          } break;
          case Flow.BACK: {
            this.pos = stack.pos - 1;
            this.popMeta(result);
          } break;
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

  private lookUpStack(ntermName: string, pos: number): boolean {
    for (let i=this.stack.length-2; --i; i>=0) {
      const stack = this.stack[i];
      if (
        stack.pos === pos 
        && typeof stack.meta === 'object' 
        && stack.meta.type === MetaType.NONTERMINAL 
        && stack.meta.value === ntermName
      ) {
        return true;
      }
    }
    return false;
  }

  private matchStr(context: Stack<T>, elem: T): MatchResult<T> {
    let state: {
      index: number;
      terms: T[];
      source: T[];
    } = context.state;
    if (context.state == null) {
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
        return acceptReturn({
          label: this.array.display(term),
          source: state.source, 
        });
      } else {
        return acceptContinue();
      }
    } else {
      return rejectBack();
    }
  }

  private matchNonTerminal(context: Stack<T>, elem: T): MatchResult<T> {
    let state: boolean = context.state;
    const nterm = (context.meta as Meta).value as string;
    if (state == null) {
      if (this.lookUpStack(nterm, context.pos)) {
        return rejectBack();
      }
      context.state = true;
      let newMeta = eebnfSchema[nterm];
      if (newMeta == null) {
        this.error(`non-terminal "${nterm}" is not defined.`, true);
        this.stopFlag = true;
        return rejectBack();
      }
      this.pushMeta(newMeta, this.pos);
      return newStack();
    } else {
      if (context.result.flow === Flow.RETURN) {
        return rejectReturn({
          label: nterm,
          children: [context.result.return],
        });
      } else {
        return rejectBack();
      }
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
      return newStack();
    } else {
      if (context.result.flow === Flow.RETURN) {
        return rejectReturn(context.result.return);
      } else {
        if (state.index < metaVals.length) {
          let nextMeta = metaVals[state.index];
          this.pushMeta(nextMeta, this.pos);
          state.index++;
          return newStack();
        } else {
          return rejectBack();
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
      return newStack();
    } else {
      if (context.result.flow === Flow.RETURN) {
        return rejectReturn(context.result.return);
      } else {
        return rejectReturn(null);
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
      return newStack();
    } else {
      if (context.result.return) {
        state.children.push(context.result.return);
      }
      if (context.result.flow === Flow.BACK) {
        return rejectReturn({
          label: 'repetition',
          children: state.children,
        });
      } else {
        this.pushMeta(metaVals[0], this.pos);
        return newStack();
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
      return newStack();
    } else {
      if (context.result.return) {
        state.children.push(context.result.return);
      }
      if (context.result.flow === Flow.RETURN) {
        if (state.index < metaVals.length) {
          let nextMeta = metaVals[state.index];
          this.pushMeta(nextMeta, this.pos);
          state.index++;
          return newStack();
        } else {
          return acceptReturn({
            label: 'grouping',
            children: state.children,
          });
        }
      } else {
        return rejectBack();
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
      let chs = meta.value.map(e => `${strMetaVal(e)}`);
      children = chs.join(',');
    } else {
      return `${MetaType[meta.type]}={${strMetaVal(meta.value)}}`;
    }
    return `${MetaType[meta.type]}={${children}}`;
  }
}

function strResult<T>(res: MatchResult<T>): string {
  return `{${res.accept ? 'ACCEPT' : 'REJECT'}|${Flow[res.flow]}|${JSON.stringify(res.return)}}`;
}