import fs from 'fs';
import { generateNFA, genState } from './nfa';
import { Parser } from './parser';
import { eebnfSchema } from './schema';
import { StringArray } from './type';

// main
(function () {
  const src = fs.readFileSync('test/test1.ebnf', {
    encoding: 'utf-8'
  });
  const strArr = new StringArray(src);
  const parser = new Parser(strArr);
  const result = parser.exec();
  console.log('result=', result);

  // fs.writeFileSync('test/out.rs', rsrc, {
  //   encoding: 'utf-8',
  // });

  ///////////////

  // const map = generateNFA(eebnfSchema);
  // console.log(map);
})();
