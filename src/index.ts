import fs from 'fs';
import { Parser } from './parser';
import { StringArray } from './type';

// main
(function () {
  const src = fs.readFileSync('test/bootstrap.ebnf', {
    encoding: 'utf-8'
  });
  const strArr = new StringArray(src);
  const parser = new Parser(strArr);
  const result = parser.exec();
  console.log('result=', result);

  // fs.writeFileSync('test/out.rs', rsrc, {
  //   encoding: 'utf-8',
  // });
})();
