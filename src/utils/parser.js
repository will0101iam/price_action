export const parseReviewInput = (input) => {
  let content = input;
  
  // Try to parse as JSON first to extract "输出"
  try {
    const jsonInput = JSON.parse(input);
    if (jsonInput["输出"]) {
      content = jsonInput["输出"];
    }
  } catch (e) {
    // If not JSON, assume it's the raw string content
    // console.log("Input is not JSON, treating as raw text");
  }

  const result = {
    name: "",
    goodPoints: [],
    improvements: [],
    byteStyle: []
  };

  // Split by headers
  const sections = content.split(/###\s+/);
  
  // Check if we actually found headers. If split results in 1 element and it doesn't look like a header section,
  // we might have a raw list without headers.
  const hasHeaders = sections.length > 1 || (sections.length === 1 && sections[0].startsWith("被评价人姓名"));

  if (hasHeaders) {
    sections.forEach(section => {
      if (section.startsWith("被评价人姓名")) {
        const match = section.match(/被评价人姓名：(.*)/);
        if (match) {
          result.name = match[1].trim();
        }
      } else if (section.startsWith("做得好的地方")) {
        result.goodPoints = parseList(section);
      } else if (section.startsWith("待改进的地方")) {
        result.improvements = parseList(section);
      } else if (section.startsWith("字节范评语")) {
        result.byteStyle = parseByteStyle(section);
      }
    });
  } else {
    // Fallback: Parse the entire content as a list and try to classify
    const allItems = parseList(content);
    
    allItems.forEach(item => {
      // Heuristic classification
      const textToCheck = (item.title + item.content).toLowerCase();
      const improvementKeywords = ["需", "待", "建议", "优化", "加强", "不足", "问题", "缺失", "风险", "漏洞", "复用性", "联动"];
      const isImprovement = improvementKeywords.some(keyword => textToCheck.includes(keyword));
      
      if (isImprovement) {
        result.improvements.push(item);
      } else {
        result.goodPoints.push(item);
      }
    });
  }

  return result;
};

const parseList = (sectionText) => {
  const lines = sectionText.split('\n');
  const items = [];
  let currentItem = null;

  lines.forEach(line => {
    const match = line.match(/^(\d+)\.\s+(.*)/);
    if (match) {
      if (currentItem) items.push(currentItem);
      
      const rawContent = match[2];
      let title = "";
      let body = rawContent;

      // Try to match bold title: **Title** or ****
      const titleMatch = rawContent.match(/\*\*(.*?)\*\*：?(.*)/);
      
      if (titleMatch) {
        title = titleMatch[1]; // Can be empty string if ****
        const afterTitle = titleMatch[2];
        
        // If there is content after the bold part, use it as body
        if (afterTitle) {
            body = afterTitle;
        } else {
            // If nothing after bold part, maybe the bold part was the whole line?
            // But titleMatch[2] captures ".*", so it would be empty string.
            // If user wrote "**Title**", title="Title", body=""
            body = ""; 
        }
      } else {
         // No bold markers found. 
         // Try to find a colon separator (Title：Content or Title: Content)
         const colonMatch = rawContent.match(/^([^：:]+)[：:](.*)/);
         if (colonMatch) {
             title = colonMatch[1];
             body = colonMatch[2];
         }
      }

      // If title is empty (e.g. from **** or no bold/colon), try to extract from body
      if (!title.trim() && body.trim()) {
        // Pattern: "Title。Content" or "Title. Content" or "Title；Content"
        // We take the first sentence-like structure as title
        const splitMatch = body.match(/^(.+?)[。！；!?;](.*)/);
        if (splitMatch) {
          title = splitMatch[1];
          body = splitMatch[2];
        } else {
            // If no punctuation, check length. If it's short, maybe it's just a title?
            // But safer to keep it as body if we are not sure.
            // Or, if the user used ****, they intend for a title to be there.
            // For now, let's leave title empty if we can't find a delimiter.
        }
      }

      currentItem = {
        title: title.trim(),
        content: body.trim() || (title.trim() ? "" : rawContent) // Fallback to raw if both empty (shouldn't happen)
      };
    } else if (currentItem && line.trim()) {
      // Append continuation lines to the current item
      currentItem.content += " " + line.trim();
    }
  });
  
  if (currentItem) items.push(currentItem);
  return items;
};

const parseByteStyle = (sectionText) => {
  const lines = sectionText.split('\n');
  const items = [];
  
  const contentStart = sectionText.indexOf('\n');
  if (contentStart === -1) return [];
  
  const body = sectionText.substring(contentStart);
  
  // Split by pattern that looks like a new list item start
  const rawItems = body.split(/\n\d+\.\s+/);
  
  rawItems.forEach(item => {
    const trimmed = item.trim();
    if (!trimmed) return;
    
    const cleanItem = trimmed.replace(/^\d+\.\s+/, "");
    
    try {
      const parsed = JSON.parse(cleanItem);
      items.push(parsed);
    } catch (e) {
      const firstBrace = cleanItem.indexOf('{');
      const lastBrace = cleanItem.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          const jsonStr = cleanItem.substring(firstBrace, lastBrace + 1);
          items.push(JSON.parse(jsonStr));
        } catch (e2) {
            // console.error("Failed to parse byte style item:", cleanItem);
        }
      }
    }
  });
  
  return items;
};
