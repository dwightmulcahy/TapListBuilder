// Merge V8 function/block ranges across browser tests before converting to
// Istanbul. Calling v8-to-istanbul.applyCoverage repeatedly on the same
// converter duplicates branch/function counters and corrupts percentages.
// V8 omits a block range when it ran as often as its parent, so a range missing from
// one sample means "the parent's count", not 0. Each merged range therefore takes the
// highest count any sample gives it, read from that sample's innermost enclosing range.
function countAt(ranges,range){
  let best=null;
  for(const r of ranges){
    if(r.startOffset<=range.startOffset&&r.endOffset>=range.endOffset&&
       (!best||r.endOffset-r.startOffset<=best.endOffset-best.startOffset))best=r;
  }
  return best?best.count:0;
}
function mergeFunctionCoverage(samples){
  const functions=new Map();
  for(const sample of samples){
    for(const fn of sample){
      const outer=fn.ranges?.[0];
      if(!outer)continue;
      const key=`${fn.functionName}| ${outer.startOffset}:${outer.endOffset}`;
      let combined=functions.get(key);
      if(!combined){
        combined={functionName:fn.functionName,isBlockCoverage:fn.isBlockCoverage,samples:[],ranges:new Map()};
        functions.set(key,combined);
      }
      combined.isBlockCoverage=combined.isBlockCoverage||fn.isBlockCoverage;
      combined.samples.push(fn.ranges);
      for(const range of fn.ranges)combined.ranges.set(`${range.startOffset}:${range.endOffset}`,range);
    }
  }
  return [...functions.values()].map(fn=>({
    functionName:fn.functionName,isBlockCoverage:fn.isBlockCoverage,
    ranges:[...fn.ranges.values()].map(r=>({startOffset:r.startOffset,endOffset:r.endOffset,
      count:Math.max(...fn.samples.map(ranges=>countAt(ranges,r)))}))
      .sort((a,b)=>a.startOffset-b.startOffset||b.endOffset-a.endOffset)
  }));
}
module.exports={mergeFunctionCoverage};
