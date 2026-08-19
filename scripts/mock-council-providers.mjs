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
    content:
      "A decision process improves when people surface problems and disagreements rather than avoiding them. Reliable relationships require observable candor and a process for working through mistakes.",
    dataset_id: "mock-dataset",
    document_id: "doc-trust",
    document_name: "Principles — Radical Truth",
    id: "mock-trust",
    positions: [],
    similarity: 0.94,
  },
  {
    content:
      "Incentives can explain behavior that is otherwise misread as personality. Examine what behavior is rewarded, tolerated, or made costly before assigning motives.",
    dataset_id: "mock-dataset",
    document_id: "doc-incentives",
    document_name: "Poor Charlie's Almanack — Incentives",
    id: "mock-incentives",
    positions: [],
    similarity: 0.91,
  },
  {
    content:
      "When uncertainty is material, preserve a margin for error and avoid making an irreversible commitment before the key uncertainty has been tested.",
    dataset_id: "mock-dataset",
    document_id: "doc-margin",
    document_name: "Berkshire letters — Margin of Safety",
    id: "mock-margin",
    positions: [],
    similarity: 0.88,
  },
];

const brief = {
  agreement: [
    {
      citations: ["R1", "R2"],
      layer: "interpretation",
      text: "Council nên làm rõ hành vi và cơ chế tạo ra conflict avoidance trước khi kết luận về partnership.",
    },
  ],
  crux: [
    {
      citations: ["R1", "R3"],
      layer: "interpretation",
      text: "Crux là liệu conflict avoidance có thay đổi sau một test hành vi rõ ràng hay không.",
    },
  ],
  disagreement: [
    {
      citations: ["R1", "R2"],
      layer: "interpretation",
      text: "Evidence chưa đủ để biết vấn đề chủ yếu là trust, incentives hay kỹ năng xử lý conflict.",
    },
  ],
  factsVsAssumptions: [
    {
      citations: [],
      layer: "application",
      status: "fact",
      text: "Theo context của bạn, cofounder có năng lực cao.",
    },
    {
      citations: ["R1", "R2"],
      layer: "interpretation",
      status: "assumption",
      text: "Việc né conflict có thể là vấn đề hành vi có thể kiểm chứng, không nên mặc định là tính cách cố định.",
    },
  ],
  nextMoves: [
    {
      citations: ["R1", "R3"],
      layer: "application",
      text: "Chạy một conflict protocol test 30–60 ngày với hành vi, ownership và review date cụ thể trước khi đưa ra quyết định khó đảo ngược.",
    },
  ],
  reversibilityDownside: [
    {
      citations: ["R3"],
      layer: "interpretation",
      text: "Một thử nghiệm có thời hạn giữ lựa chọn reversible hơn việc chấm dứt partnership ngay.",
    },
  ],
  situation: {
    citations: [],
    layer: "application",
    text: "Bạn đang cân nhắc tiếp tục một partnership có năng lực cao nhưng có dấu hiệu né conflict.",
  },
  unknowns: [
    {
      citations: [],
      layer: "application",
      text: "Bạn chưa biết cofounder phản ứng thế nào khi expectations, ownership và consequence được nói rõ.",
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
    const selectedChunks = question.includes("NO_EVIDENCE_FIXTURE")
      ? []
      : chunks;
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
