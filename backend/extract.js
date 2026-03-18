import mammoth from 'mammoth';
import fs from 'fs';

async function run() {
  const result1 = await mammoth.extractRawText({path: "../reference_docs/Programme Structure 2025-26 BCA.docx"});
  fs.writeFileSync('bca_structure.txt', result1.value);

  const result2 = await mammoth.extractRawText({path: "../reference_docs/BCA CO TABLE.docx"});
  fs.writeFileSync('bca_cos.txt', result2.value);
}
run();
