
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

function A(label: string) {
  return {
    type: MetaType.NONTERMINAL,
    value: label,
  };
}

function OR(...item: MetaVal[]): Meta {
  return {
    type: MetaType.ALTERNATION,
    value: item,
  };
}

function EX(...item: MetaVal[]): Meta {
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

function LOOP(...item: MetaVal[]): Meta {
  return {
    type: MetaType.REPETITION,
    value: item,
  };
}

function IN(...item: MetaVal[]): Meta {
  return {
    type: MetaType.GROUPING,
    value: item,
  };
}

export type Schema = { [key: string]: Meta };

export const eebnfSchema: Schema = {
  ENTRY: IN(LOOP(OR(A('rule'), A('comment')))),
  _: LOOP(OR(' ', '\t', '\n')),
  comment: IN('//', LOOP('\\N')),
  rule: IN(A('_'), A('name'), A('_'), '=', A('list'), ';', A('_'), EX('comment')),
  name: IN('\\a', LOOP('\\w')),
  list: OR(A('item'), IN(LOOP(A('item'), ','), A('item'))),
  item: IN(A('_'), OR(A('name'), A('term'), A('group'), A('alter'), A('option'), A('repeat')), A('_')),
  term: IN('\\"', '\\S', LOOP('\\S'), '\\"'),
  group: IN("(", A('_'), A('list'), A('_'), ")"),
  alter: IN(A('item'), '|', A('item')),
  option: IN('[', A('_'), A('list'), A('_'), ']'),
  repeat: IN('{', A('_'), A('list'), A('_'), '}'),
}
