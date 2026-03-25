#!/usr/bin/env node

const { PaperModel } = require('./model');

function main() {
  const model = new PaperModel({});
  const summary = model.summarize();
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main();
}
