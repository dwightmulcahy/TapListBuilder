const test=require("node:test");
const assert=require("node:assert/strict");
const {mergeFunctionCoverage}=require("../scripts/merge-v8-coverage.cjs");
const fn=(outer,inner)=>[{
  functionName:"render",
  isBlockCoverage:true,
  ranges:[
    {startOffset:0,endOffset:100,count:outer},
    {startOffset:20,endOffset:40,count:inner}
  ]
}];
test("combines the same function across browser scenarios without duplicating counters",()=>{
  const merged=mergeFunctionCoverage([fn(1,0),fn(1,1),fn(0,0)]);
  assert.equal(merged.length,1);
  assert.deepEqual(merged[0].ranges,[
    {startOffset:0,endOffset:100,count:1},
    {startOffset:20,endOffset:40,count:1}
  ]);
});
test("preserves distinct function offsets and excludes empty samples",()=>{
  const extra=[{functionName:"render",isBlockCoverage:true,ranges:[{startOffset:110,endOffset:200,count:2}]}];
  const merged=mergeFunctionCoverage([[],fn(0,0),extra]);
  assert.equal(merged.length,2);
  assert.equal(merged[0].ranges[0].count,0);
  assert.equal(merged[1].ranges[0].count,2);
});
test("keeps ranges in start-offset order with outer range before inner range",()=>{
  const samples=[[{functionName:"x",isBlockCoverage:true,ranges:[
    {startOffset:10,endOffset:20,count:1},
    {startOffset:0,endOffset:100,count:1}
  ]}]];
  const merged=mergeFunctionCoverage(samples);
  assert.equal(merged[0].ranges[0].startOffset,0);
  assert.equal(merged[0].ranges[1].startOffset,10);
});
