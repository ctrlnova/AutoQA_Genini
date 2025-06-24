import * as dotenv from 'dotenv'; // Import dotenv
dotenv.config(); // Load environment variables from .env file

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import * as fs from 'fs';
import * as path from 'path';
import config from './config.json';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Now this will be populated by dotenv

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not found. Make sure it's set in your .env file or environment variables.");
  process.exit(1);
}

// ... rest of your script remains the same
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const generationConfig = {
  temperature: 0.2,
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

async function generateTests() {
  try {
    const featureFilePath = path.join(__dirname, 'features', 'novel_actions.feature');
    const bddScenarios = fs.readFileSync(featureFilePath, 'utf-8');
    const configContent = JSON.stringify(config, null, 2);

   // ... (rest of your generate_playwright_tests.ts up to the prompt) ...

    const prompt = `
You are an expert Playwright test script generator.
Your task is to convert the provided BDD Gherkin scenarios into a single Playwright TypeScript test file.
Use the provided 'config.json' for all URLs and XPath selectors.

**CRITICAL PLAYWRIGHT BEST PRACTICES FOR SELECTORS (MUST FOLLOW):**
1.  **Always use \`page.locator()\` to get a reference to an element before interacting with it.** Do NOT use direct page actions like \`page.click("selector")\` if the selector is an XPath.
2.  **When using an XPath from \`config.json\` with \`page.locator()\`, ALWAYS prefix it with \`xpath=\`.**
    Correct example: \`const myElement = page.locator(\`xpath=\${config.xpaths.someXPathKey}\`);\`
    Incorrect example: \`const myElement = page.locator(config.xpaths.someXPathKey);\`
    Incorrect example: \`await page.click(config.xpaths.someXPathKey);\`
3.  **After obtaining a locator, perform actions (like \`.click()\`, \`.fill()\`) or assertions (like \`expect(...).toBeVisible()\`) on the locator object.**
    Example: \`const buttonLocator = page.locator(\`xpath=\${config.xpaths.submitButton}\`); await buttonLocator.click();\`
4.  **Chaining Locators with Absolute XPaths:** If an XPath in \`config.json\` is absolute (starts with '/' or '//'), and you need to find it, locate it directly from the \`page\` object (e.g., \`page.locator(\`xpath=\${config.xpaths.absoluteChildXPath}\`)\`). Do NOT chain an absolute XPath locator from another locator that was also found with an absolute XPath, as this is incorrect usage. If chaining is truly necessary and the child element's XPath is absolute in the config, it implies the config might need a relative XPath for that child, or you should locate the child directly from the page. For this task, assume all XPaths in the config are intended to be located directly from the \`page\` object unless a step explicitly implies a parent-child relationship where a relative selector would be more appropriate (but no such case exists in the provided BDD).

**GENERAL INSTRUCTIONS:**
1.  **Imports:** Start the generated file with:
    \`import { test, expect } from '@playwright/test';\`
    \`import config from '../config.json';\` (Note the relative path for tests potentially inside a 'tests' directory).
2.  **Test Structure:** Convert each Gherkin 'Scenario' into a Playwright \`test('Exact Scenario Name from Gherkin', async ({ page }) => { ... });\` block.
3.  **Mapping Gherkin Steps to Playwright Actions:**
    *   "Given I am on the homepage" -> \`await page.goto(config.baseUrl);\`
    *   "Given I am on the genre page" -> \`await page.goto(config.tagsUrl);\`
    *   "When I click on the 'Genres' tab":
        \`const genresTabLocator = page.locator(\`xpath=\${config.xpaths.genresTabLink}\`);\`
        \`await expect(genresTabLocator).toBeVisible();\`
        \`await genresTabLocator.click();\`
    *   "When I select 'Abandoned Children'":
        \`const genreLinkLocator = page.locator(\`xpath=\${config.xpaths.abandonedChildrenLink}\`);\`
        \`await expect(genreLinkLocator).toBeVisible();\`
        \`await genreLinkLocator.click();\`
4.  **Mapping Gherkin Verification Steps:**
    *   "Then I should see a list of available genres like 'Fantasy', 'Romance', 'Sci-fi'":
        \`const genrePanelLocator = page.locator(\`xpath=\${config.xpaths.genreListPanel}\`);\`
        \`await expect(genrePanelLocator).toBeVisible();\`
        \`// Optional but good: const genreLinks = genrePanelLocator.locator('a');\`
        \`// await expect(genreLinks.first()).toBeVisible();\`
        \`// console.log(\`Found \${await genreLinks.count()} genre links.\`);\`
    *   "Then I should see a list of novels under the 'Abandoned Children' genre":
        *   Verify title:
            \`const genreTitleLocator = page.locator(\`xpath=\${config.xpaths.abandonedChildrenTitleCheck}\`);\`
            \`await expect(genreTitleLocator).toBeVisible();\`
            \`await expect(genreTitleLocator).toContainText(/abandoned children/i);\`
        *   Verify the panel containing the novel list is visible (using its specific XPath from config):
            \`const listPanelLocator = page.locator(\`xpath=\${config.xpaths.abandonedChildrenPanelVerification}\`);\`
            \`await expect(listPanelLocator).toBeVisible();\`
        *   Verify the table of novels is visible (locating it directly using its absolute XPath from config):
            \`const novelTableLocator = page.locator(\`xpath=\${config.xpaths.novelTableForGenre}\`);\`
            \`await expect(novelTableLocator).toBeVisible();\`
        *   Optionally, count and log novels:
            \`const novels = await novelTableLocator.locator('a').all();\`
            \`console.log(\`Found \${novels.length} novels under "Abandoned Children" genre\`);\`
            \`expect(novels.length).toBeGreaterThanOrEqual(0);\`
5.  **Screenshots:** Add a screenshot at the end of each test for visual verification:
    \`await page.screenshot({ path: 'tests/screenshots/descriptive_unique_name.png', fullPage: true });\`
    Ensure screenshot filenames are descriptive and unique (e.g., 'view_genres_list.png', 'abandoned_children_novels.png').
6.  **Await Promises:** Ensure all Playwright interactions that return a Promise are \`await\`ed.
7.  **XPath Usage:** Strictly use the XPaths from \`config.json\` as instructed (with \`xpath=\` prefix in \`page.locator()\`). Do not hardcode XPaths.
8.  **Output Format:** Output ONLY the TypeScript code for the Playwright test file. Do not include any other text, explanations, or markdown formatting like \`\`\`typescript ... \`\`\`.

**BDD Scenarios (.feature file content):**
\`\`\`gherkin
${bddScenarios}
\`\`\`

**Configuration (config.json content):**
\`\`\`json
${configContent}
\`\`\`

Now, generate the Playwright TypeScript test file based *strictly* on these instructions.
`;

    // ... (rest of your script to call Gemini API and write file) ...





    console.log("Sending request to Gemini API...");
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
    });

    const response = result.response;
    let generatedCode = response.text();

    if (!generatedCode) {
        console.error("No code generated by Gemini API.");
        if (response.promptFeedback) {
            console.error("Prompt Feedback:", response.promptFeedback);
        }
        if (response.candidates && response.candidates[0].finishReason !== 'STOP') {
            console.error("Finish Reason:", response.candidates[0].finishReason);
            console.error("Safety Ratings:", response.candidates[0].safetyRatings);
        }
        return;
    }

    generatedCode = generatedCode.replace(/^```typescript\s*/i, '').replace(/\s*```$/, '').trim();


    const outputDir = path.join(__dirname, 'tests');
    const screenshotsDir = path.join(outputDir, 'screenshots');
    const outputFilePath = path.join(outputDir, 'generated_tests.spec.ts');

    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(screenshotsDir)){
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, generatedCode, 'utf-8');
    console.log(`Playwright test script generated successfully at: ${outputFilePath}`);

  } catch (error) {
    console.error("Error generating tests:", error);
  }
}

generateTests();