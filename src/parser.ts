import { SourceArray } from './type';
import { eebnfSchema, MetaType, MetaVal } from './schema';

interface Stack {
  meta: MetaVal;
  state: any;
  result: MatchResult;
  pos: number;
}

enum MatchResult {
  UNKNOWN = 0,
  ACCEPT,
  ACCEPT_COMPLETE,
  REJECT,
  REJECT_STOP,
}

export class Parser<T_Element, T_Terminal> {

  static fromSourceArray<T_Element, T_Terminal>(array: SourceArray<T_Element, T_Terminal>) {
    return new Parser<T_Element, T_Terminal>(array);
  }

  private array: SourceArray<T_Element, T_Terminal>;
  private metaMatch: Map<MetaType, (context: Stack, elem: T_Element) => MatchResult>;

  constructor(array: SourceArray<T_Element, T_Terminal>) {
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
  private stack: Stack[];
  private stopFlag: boolean;

  private push(meta: MetaVal, pos: number) {
    this.stack.push({
      meta,
      pos,
      state: null,
      result: MatchResult.UNKNOWN,
    });
  }

  private pop(result: MatchResult) {
    this.stack.pop();
    const top = this.peek();
    if (top) {
      top.result = result;
    }
  }

  private peek(): Stack | undefined {
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
    this.push(eebnfSchema['ENTRY'], 0);
  }

  step(): boolean {
    this.pos++;
    const elem = this.array.elementAt(this.pos);
    const stack = this.peek();
    if (stack) {
      let result = MatchResult.UNKNOWN;
      if (typeof stack.meta === 'string') {
        result = this.matchStr(stack, elem);
      } else {
        result = this.metaMatch.get(stack.meta.type).call(this, stack, elem);
      }
      switch(result) {
        case MatchResult.ACCEPT: {
          // do nothing
        } break;
        case MatchResult.ACCEPT_COMPLETE: {
          this.pop(result);
        } break;
        case MatchResult.REJECT: {
          this.pos = stack.pos - 1;
          this.pop(result);
        } break;
        case MatchResult.REJECT_STOP: {
          this.stopFlag = true;
        } break;
        default: {
          this.error('internal: match result is unknown');
        } break;
      }
    } else {
      this.error(`expected file ending, got: ${this.array.display(elem)}`);
    }
    return this.stopFlag;
  }

  private matchStr(context: Stack, elem: T_Element): MatchResult {
    let state: {
      index: number;
      terminals: T_Terminal[];
    } = context.state;
    if (state == null) {
      state = {
        index: 0,
        terminals: this.array.split(context.meta as string),
      };
      context.state = state;
    }
    const term = state.terminals[state.index];
    state.index++;
    if (this.array.match(term, elem)) {
      if (state.index >= state.terminals.length) {
        return MatchResult.ACCEPT_COMPLETE;
      } else {
        return MatchResult.ACCEPT;
      }
    } else {
      return MatchResult.REJECT;
    }
  }

  private matchNonTerminal(context: Stack, elem: T): MatchResult {
    // todo:
  }

  private matchAlternation(context: Stack, elem: T): MatchResult {
    // todo:
  }

  private matchOptional(context: Stack, elem: T): MatchResult {
    // todo:
  }

  private matchRepetition(context: Stack, elem: T): MatchResult {
    // todo:
  }

  private matchGrouping(context: Stack, elem: T): MatchResult {
    // todo:
  }
}