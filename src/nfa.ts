import { Meta, MetaType, MetaVal, Schema } from "./schema";
// import { splitTerm } from "./type";

export enum NFAStateType {
  NTERM_START,
  NTERM_END,
}

export class NFAState {

  addTermNext(term: string, next: NFAState) {
    if (this.nextTerm == null) {
      this.nextTerm = {};
    }
    this.nextTerm[term] = next;
  }

  addNtermNext(nterm: string, next: NFAState) {
    if (this.nextNterm == null) {
      this.nextNterm = {};
    }
    this.nextNterm[nterm] = next;
  }

  addNext(next: NFAState) {
    if (this.next == null) {
      this.next = [];
    }
    this.next.push(next);
  }

  next: NFAState[];
  nextTerm: {[key: string]: NFAState};
  nextNterm: {[key: string]: NFAState};

}

/** 内部转换时的辅助结构 */
interface GenNode {
  state: NFAState;
  meta: Meta;
}

export function generateNFA(schema: Schema): {[key: string]: NFAState} {
  const nfaStates = {};
  for (let key in schema) {
    nfaStates[key] = genState(schema[key]);
  }
  return nfaStates;
}

export function genState(meta: MetaVal): NFAState[] {
  const start = new NFAState();
  const end = new NFAState();
  if (typeof meta === 'string') {
    const s = new NFAState();
    start.addTermNext(meta, s);
    s.addNext(end);
  } else {
    switch(meta.type) {
      case MetaType.NONTERMINAL: {
        start.addNtermNext(meta.value as string, end);
      } break;
      case MetaType.ALTERNATION: {
        for (let ch of meta.value as MetaVal[]) {
          const [s0, s1] = genState(ch);
          start.addNext(s0);
          s1.addNext(end);
        }
      } break;
      case MetaType.OPTIONAL: {
        start.addNext(end);
        const [s0, s1] = genState(meta.value[0]);
        start.addNext(s0);
        s1.addNext(end);
      } break;
      case MetaType.REPETITION: {
        const [s0, s1] = genState(meta.value[0]);
        start.addNext(s0);
        start.addNext(end);
        s1.addNext(end);
        s1.addNext(s0);
      } break;
      case MetaType.GROUPING: {
        for (let ch of meta.value as MetaVal[]) {
          const [s0, s1] = genState(ch);
          start.addNext(s0);
          s1.addNext(end);
        }
      } break;
    }
  }
  return [start, end];
}