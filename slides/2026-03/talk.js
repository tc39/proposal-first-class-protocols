import "https://webplatform.design/talks/common/talk.js";

let keywords = ["protocol", "requires", "implements"];
let keywordPatterns = keywords.map(keyword => RegExp(`\\b${keyword}\\b`));

Prism.languages.javascript.keyword.push(...keywordPatterns);
