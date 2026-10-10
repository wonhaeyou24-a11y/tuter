const { BrickyDialogueEngine } = require('./dialogue.js');

console.log("=== 🧱 [Acknowledge-Expand-Ping] 사람 같은 완전 문장 대화 시뮬레이션 ===\n");

const scenarios = [
  {
    name: "시나리오 1: 점심 식사 & 피자 티키타카 (완전한 문장 확장)",
    turns: [
      "I ate yummy pizza for lunch!",
      "I ate two big slices!",
      "What is your favorite food, Bricky?"
    ]
  },
  {
    name: "시나리오 2: 놀이터 & 미끄럼틀 경험 (감정 공감 & 완전한 문장)",
    turns: [
      "I played at the playground!",
      "I rode the big slide!",
      "Do you want to know more, Bricky?"
    ]
  },
  {
    name: "시나리오 3: 레고 만들기 & 협동 조립 (역할놀이 완전 문장)",
    turns: [
      "I want to build Legos!",
      "Let's build a giant space rocket!",
      "Can you help me build it, Bricky?"
    ]
  },
  {
    name: "시나리오 4: 엉뚱한 말 / 망설임 / 정체 질문",
    turns: [
      "uh... um...",
      "Yes, I like that!",
      "Who are you?"
    ]
  }
];

for (const scenario of scenarios) {
  console.log(`\n--------------------------------------------------`);
  console.log(`🎬 [${scenario.name}]`);
  console.log(`--------------------------------------------------`);
  
  const simEngine = new BrickyDialogueEngine();
  
  for (let i = 0; i < scenario.turns.length; i++) {
    const userUtterance = scenario.turns[i];
    console.log(`\n👦 시우(Turn ${i + 1}): "${userUtterance}"`);
    
    const response = simEngine.generateContextualResponse(userUtterance);
    console.log(`🤖 브릭키: "${response.replyEn}"`);
    console.log(`   (한글): "${response.replyKr}"`);
    console.log(`   👉 추천 완전 문장 카드(Sentence Frame Suggestions):`);
    if (response.suggestions && response.suggestions.length > 0) {
      response.suggestions.forEach((s, idx) => {
        console.log(`      ${idx + 1}. [${s.emoji}] ${s.en} (${s.kr})`);
      });
    } else {
      console.log(`      (선택지 없음 ⚠️)`);
    }
  }
}
