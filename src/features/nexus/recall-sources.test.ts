import { expect, it } from "vitest";
import { recallSources } from "./recall-sources";
it("keeps unique internal conversation identifiers and ignores invalid metadata",()=>{
 expect(recallSources({retrieval:{conversationIds:["c1","c1","../../other","https://bad","c2",3]}})).toEqual(["c1","c2"]);
 expect(recallSources(null)).toEqual([]);
});
