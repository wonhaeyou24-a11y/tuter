const { BrickyDialogueEngine } = require('./dialogue.js');

const engine = new BrickyDialogueEngine();

console.log("=== 🧱 브릭키 & 7세 시우 1:1 대화 멀티턴 시뮬레이션 테스트 ===\n");

const scenarios = [
  {
    name: "시나리오 1: 점심 식사 & 피자 토핑 티키타카",
    turns: [
      "I ate yummy pizza for lunch!",
      "Lots of extra cheese!",
      "What is your favorite food, Bricky?"
    ]
  },
  {
    name: "시나리오 2: 놀이터 & 친구와 미끄럼틀 타기",
    turns: [
      "I played at the playground!",
      "I went on the big yellow slide!",
      "Do you want to know more, Bricky?"
    ]
  },
  {
    name: "시나리오 3: 레고 블록 만들기 & 협동 조립",
    turns: [
      "I love building Legos!",
      "A giant space rocket!",
      "Can you help me build it, Bricky?"
    ]
  },
  {
    name: "시나리오 4: 엉뚱한 말 / 망설임 / 짧은 단답",
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
  
  // 시나리오마다 새 대화 세션
  const simEngine = new BrickyDialogueEngine();
  
  for (let i = 0; i < scenario.turns.length; i++) {
    const userUtterance = scenario.turns[i];
    console.log(`\n👦 시우(Turn ${i + 1}): "${userUtterance}"`);
    
    const response = simEngine.generateContextualResponse(userUtterance);
    console.log(`🤖 브릭키: "${response.replyEn}"`);
    console.log(`   (한글): "${response.replyKr}"`);
    console.log(`   👉 추천 선택지(Suggestions):`);
    if (response.suggestions && response.suggestions.length > 0) {
      response.suggestions.forEach((s, idx) => {
        console.log(`      ${idx + 1}. [${s.emoji}] ${s.en} (${s.kr})`);
      });
    } else {
      console.log(`      (선택지 없음 ⚠️)`);
    }
  }
}
