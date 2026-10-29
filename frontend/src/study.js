// Presentation only: keep imported source text intact and never invent missing givens.
const colors = new Set(["red", "yellow", "green"]);
export function studyStatus(value) {
  const chosen = typeof value === "string" ? value : value?.confidence;
  if (colors.has(chosen)) return chosen;
  return value?.reviewed === true || value?.reviewed === 1 ? "green" : "red";
}
export function humanTopic(value = "") {
  return String(value)
    .replace(
      /^\s*\[(?:GEN|MATH|CALC|CHEM|PHYS|BIO|HIST|CODE|LANG|GEO|MD|MIXED)\]\s*/i,
      "",
    )
    .trim();
}
export function humanQuestion(
  value = "",
  fallbackNumber = 1,
  fallbackTopic = "Practice",
) {
  const original = String(value).trim();
  let question = original,
    number = String(fallbackNumber),
    topic = humanTopic(fallbackTopic),
    instruction = "";
  // Old generated files sometimes attach editorial/citation text before a bold Q heading.
  if (
    /^(?:\*\*)?(?:new\s+altered\s+short-answer\s+practice|source basis|adapted\s+practice|generated\s+practice)/i.test(
      question,
    )
  ) {
    const marker = /(?:\*\*)?\bQ\d+\s*[—–·:\-]/i.exec(question);
    if (marker) question = question.slice(marker.index);
  }
  const bold = /^\*\*Q(\d+)\s*[—–·:\-]\s*([\s\S]*?)\*\*\s*/i.exec(question);
  const line = /^Q(\d+)\s*[—–·:\-]\s*([^\n]+)\n+/i.exec(question);
  const header = bold || line;
  if (header) {
    number = header[1];
    topic = header[2].trim();
    question = question.slice(header[0].length).trim();
  } else {
    const heading = /^Q(\d+)\s*[—–·:\-]\s*(.+)$/i.exec(topic);
    if (heading) {
      number = heading[1];
      topic = heading[2];
    }
  }
  topic =
    topic
      .replace(
        /\s*\((write the equation and show units)\)\.?\s*$/i,
        (_, text) => {
          instruction = text;
          return "";
        },
      )
      .replace(/\s+(?:from\s+)?(?:the\s+)?altered lecture(?: reaction)?/gi, "")
      .replace(/\.+$/, "")
      .trim() || "Practice";
  if (instruction)
    question += `\n\n${instruction[0].toUpperCase() + instruction.slice(1)}.`;
  return {
    original,
    number,
    topic,
    question: question || original,
    needsContext:
      /\b(?:previous|preceding|above|earlier)\b[^.\n]{0,100}\b(?:amounts?|reaction|question|problem|result|data|example)\b/i.test(
        question,
      ),
  };
}
export function cardQuestion(card, number = 1, topic = "Practice") {
  return humanQuestion(card.term, number, card.topics?.[0] || topic);
}
export function countRecall(source = "") {
  let fence = null,
    count = 0;
  for (const line of String(source).split("\n")) {
    const plain = line.replace(/^ {0,3}> ?/, "");
    const marker = plain.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = null;
    } else if (!fence && /^ {0,3}>\s*\[!RECALL\]/i.test(line)) count++;
  }
  return count;
}
