# 📖 VocabTracker — 背单词工具

为小升初阶段设计的背单词工具，基于艾宾浩斯记忆曲线，支持多种测试题型。

## 功能

- 📥 单词录入：JSON 批量导入 / 剪贴板粘贴
- 📊 艾宾浩斯记忆曲线：自动安排第 1/2/4/7/15 天复习
- 📝 四种测试题型：英译中 → 中译英 → 听写 → 例句填空
- 🎯 顽固词专项攻克：连续失败的单词自动进入强化训练
- 📋 待背池：超出每日上限的单词排队等候
- 🖨️ PDF 打印：每日背诵清单 + 测试卷
- 💾 数据备份：完整导出/导入，数据存浏览器本地

## 使用方式

1. 直接用浏览器打开 `index.html`
2. 或部署到 GitHub Pages（免费）

## 导入单词

准备一个 JSON 文件，格式如下：

\`\`\`json
[
  {
    "spelling": "abandon",
    "phonetic": "/əˈbændən/",
    "meaning": "放弃",
    "exampleSentence": "They abandoned the plan.",
    "source": "卷38-金水区"
  }
]
\`\`\`

在「设置」页面导入即可。

## 技术

纯前端 Web App，无构建工具，无后端：
- 存储：IndexedDB (idb)
- PDF：jsPDF
- 发音：Web Speech API
- 部署：GitHub Pages
