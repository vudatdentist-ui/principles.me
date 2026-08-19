import http from "node:http";

const port = Number(process.env.MOCK_COUNCIL_PORT || 9399);

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

const chunks = [
  {
    id: "mock-trust",
    dataset_id: "mock-dataset",
    document_id: "doc-trust",
    document_name: "Principles — Radical Truth",
    content:
      "A decision process improves when people surface problems and disagreements rather than avoiding them. Reliable relationships require observable candor and a process for working through mistakes.",
    similarity: 0.94,
    positions: [],
  },
  {
    id: "mock-incentives",
    dataset_id: "mock-dataset",
    document_id: "doc-incentives",
    document_name: "Poor Charlie's Almanack — Incentives",
    content:
      "Incentives can explain behavior that is otherwise misread as personality. Examine what behavior is rewarded, tolerated, or made costly before assigning motives.",
    similarity: 0.91,
    positions: [],
  },
  {
    id: "mock-margin",
    dataset_id: "mock-dataset",
    document_id: "doc-margin",
    document_name: "Berkshire letters — Margin of Safety",
    content:
      "When uncertainty is material, preserve a margin for error and avoid making an irreversible commitment before the key uncertainty has been tested.",
    similarity: 0.88,
    positions: [],
  },
];

const brief = {
  situation: {
    text: "Bạn đang cân nhắc tiếp tục một partnership có năng lực cao nhưng có dấu hiệu né conflict.",
    layer: "application",
    citations: [],
  },
  factsVsAssumptions: [
    {
      status: "fact",
      text: "Theo context của bạn, cofounder có năng lực cao.",
      layer: "application",
      citations: [],
    },
    {
      status: "assumption",
      text: "Việc né conflict có thể là vấn đề hành vi có thể kiểm chứng, không nên mặc định là tính cách cố định.",
      layer: "interpretation",
      citations: ["R1", "R2"],
    },
  ],
  agreement: [
    {
      text: "Council nên làm rõ hành vi và cơ chế tạo ra conflict avoidance trước khi kết luận về partnership.",
      layer: "interpretation",
      citations: ["R1", "R2"],
    },
  ],
  disagreement: [
    {
      text: "Evidence chưa đủ để biết vấn đề chủ yếu là trust, incentives hay kỹ năng xử lý conflict.",
      layer: "interpretation",
      citations: ["R1", "R2"],
    },
  ],
  crux: [
    {
      text: "Crux là liệu conflict avoidance có thay đổi sau một test hành vi rõ ràng hay không.",
      layer: "interpretation",
      citations: ["R1", "R3"],
    },
  ],
  unknowns: [
    {
      text: "Bạn chưa biết cofounder phản ứng thế nào khi expectations, ownership và consequence được nói rõ.",
      layer: "application",
      citations: [],
    },
  ],
  reversibilityDownside: [
    {
      text: "Một thử nghiệm có thời hạn giữ lựa chọn reversible hơn việc chấm dứt partnership ngay.",
      layer: "interpretation",
      citations: ["R3"],
    },
  ],
  nextMoves: [
    {
      text: "Chạy một conflict protocol test 30–60 ngày với hành vi, ownership và review date cụ thể trước khi đưa ra quyết định khó đảo ngược.",
      layer: "application",
      citations: ["R1", "R3"],
    },
  ],
};

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, { ok: true });
  }

  if (request.method === "POST" && request.url === "/api/v1/retrieval") {
    const body = await readJson(request);
    const question = String(body.question || "");
    const selectedChunks = question.includes("NO_EVIDENCE_FIXTURE") ? [] : chunks;
    return json(response, 200, {
      code: 0,
      data: { chunks: selectedChunks },
    });
  }

  if (request.method === "POST" && request.url === "/chat/completions") {
    return json(response, 200, {
      choices: [{ message: { content: JSON.stringify(brief) } }],
    });
  }

  return json(response, 404, { error: "mock route not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Council providers listening on ${port}`);
});
