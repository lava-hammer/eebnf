
export enum MetaType {
  NONTERMINAL,
  ALTERNATION,
  OPTIONAL,
  REPETITION,
  GROUPING,
}

export interface Meta {
  type: MetaType,
  value: MetaVal[] | string,
}

export type MetaVal = string | Meta;

export function A(label: string) {
  return {
    type: MetaType.NONTERMINAL,
    value: label,
  };
}

export function OR(...item: MetaVal[]): Meta {
  return {
    type: MetaType.ALTERNATION,
    value: item,
  };
}

export function EX(...item: MetaVal[]): Meta {
  if (item.length > 1) {
    return {
      type: MetaType.OPTIONAL,
      value: [IN(...item)],
    };
  } else {
    return {
      type: MetaType.OPTIONAL,
      value: item,
    };
  }
}

export function LOOP(...item: MetaVal[]): Meta {
  if (item.length > 1) {
    return {
      type: MetaType.REPETITION,
      value: [IN(...item)],
    };
  } else {
    return {
      type: MetaType.REPETITION,
      value: item,
    }
  }
}

export function IN(...item: MetaVal[]): Meta {
  return {
    type: MetaType.GROUPING,
    value: item,
  };
}

export type Schema = { [key: string]: Meta };

export const eebnfSchema: Schema = {
  ENTRY: IN(LOOP(OR(A('rule'), A('comment')))),
  _: LOOP(OR(' ', '\t')),
  comment: IN('/', '/', LOOP('\\N')),
  rule: IN(A('_'), A('name'), A('_'), '=', A('list'), ';', A('_'), EX('comment')),
  name: IN('\\a', LOOP('\\w')),
  list: OR(A('item'), IN(LOOP(A('item'), ','), A('item'))),
  item: IN(A('_'), OR(A('name'), A('term'), A('group'), A('alter'), A('option'), A('repeat')), A('_')),
  term: IN('"', '\\X', LOOP('\\X'), '"'),
  group: IN("(", A('list'), ")"),
  alter: IN(A('item'), '|', A('item')),
  option: IN('[', A('list'), ']'),
  repeat: IN('{', A('list'), '}'),
}
