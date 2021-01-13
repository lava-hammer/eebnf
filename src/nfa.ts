import { Meta, MetaType, MetaVal, Schema } from "./schema";
// import { splitTerm } from "./type";

export enum NFAStateType {
  NTERM_START,
  NTERM_END,
}

enum TransType {
  DIRECT,
  TERMINAL,
  NON_TERMINAL,
}

interface Trans {
  type: TransType,
  text?: string;
}

export class NFAState {

  private next: Map<Trans, NFAState>;

  addTermNext(term: string, next: NFAState) {
    this.next.set({
      type: TransType.TERMINAL,
      text: term,
    }, next);
  }

  addNonTermNext(nterm: string, next: NFAState) {
    this.next.set({
      type: TransType.NON_TERMINAL,
      text: nterm,
    }, next);
  }

  addDirectNext(next: NFAState) {
    this.next.set({
      type: TransType.DIRECT,
    }, next);
  }
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
    s.addDirectNext(end);
  } else {
    switch(meta.type) {
      case MetaType.NONTERMINAL: {
        start.addNonTermNext(meta.value as string, end);
      } break;
      case MetaType.ALTERNATION: {
        for (let ch of meta.value as MetaVal[]) {
          const [s0, s1] = genState(ch);
          start.addDirectNext(s0);
          s1.addDirectNext(end);
        }
      } break;
      case MetaType.OPTIONAL: {
        start.addDirectNext(end);
        const [s0, s1] = genState(meta.value[0]);
        start.addDirectNext(s0);
        s1.addDirectNext(end);
      } break;
      case MetaType.REPETITION: {
        const [s0, s1] = genState(meta.value[0]);
        start.addDirectNext(s0);
        start.addDirectNext(end);
        s1.addDirectNext(end);
        s1.addDirectNext(s0);
      } break;
      case MetaType.GROUPING: {
        for (let ch of meta.value as MetaVal[]) {
          const [s0, s1] = genState(ch);
          start.addDirectNext(s0);
          s1.addDirectNext(end);
        }
      } break;
    }
  }
  return [start, end];
}