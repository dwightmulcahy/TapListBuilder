// Merge V8 function/block ranges across browser tests before converting to
// Istanbul. Calling v8-to-istanbul.applyCoverage repeatedly on the same
// converter duplicates branch/function counters and corrupts percentages.
function mergeFunctionCoverage(samples){
  const functions=new Map();
  for(const sample of samples){
    for(const fn of sample){
      const outer=fn.ranges?.[0];
      if(!outer)continue;
      const key=`${fn.functionName}| ${outer.startOffset}:${outer.endOffset}`;
      let combined=functions.get(key);
      if(!combined){
        combined={functionName:fn.functionName,isBlockCoverage:fn.isBlockCoverage,ranges:new Map()};
        functions.set(key,combined);
      }
      combined.isBlockCoverage=combined.isBlockCoverage||fn.isBlockCoverage;
      for(const range of fn.ranges){
        const rangeKey=`${range.startOffset}:${range.endOffset}`;
        const previous=combined.ranges.get(rangeKey);
        combined.ranges.set(rangeKey,{startOffset:range.startOffset,endOffset:range.endOffset,
          count:Math.max(previous?.count??0,range.count)});
      }
    }
  }
  return [...functions.values()].map(fn=>({
    functionName:fn.functionName,isBlockCoverage:fn.isBlockCoverage,
    ranges:[...fn.ranges.values()].sort((a,b)=>a.startOffset-b.startOffset||b.endOffset-a.endOffset)
  }));
}
module.exports={mergeFunctionCoverage};
