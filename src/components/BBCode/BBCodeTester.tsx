import React, { useState } from 'react';
import { parseBBCode } from '../../utils/bbcodeParser';
import BBCodeRenderer from '../BBCode/BBCodeRenderer';

/** Dev tool: live BBCode parser preview (route: /bbcode-test). */
const BBCodeTester: React.FC = () => {
  const [input, setInput] = useState(`[b]bold text[/b]
[i]italic text[/i]
[u]underlined text[/u]
[s]strikethrough text[/s]
[color=red]red text[/color]
[size=150]big text[/size]

[quote="Test User"]This is a quote example[/quote]

[code]
function hello() {
    console.log("Hello World!");
}
[/code]

[spoiler]This is spoiler content[/spoiler]

[box=Box title]This is box content[/box]

[list]
[*]List item 1
[*]List item 2
[*]List item 3
[/list]

[url=https://osu.ppy.sh]osu! website[/url]
[profile=123456]User link[/profile]

[centre]Centered text[/centre]

[heading]This is a heading[/heading]

[notice]Important notice content[/notice]

[img]https://assets.ppy.sh/images/osu-logo.png[/img]

[youtube]dQw4w9WgXcQ[/youtube]`);

  const parseResult = parseBBCode(input);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">BBCode Parser Test</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">BBCode Input</h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-card text-gray-900 dark:text-gray-100 resize-none"
            placeholder="Enter BBCode here..."
          />

          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              parseResult.valid
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {parseResult.valid ? '✓ Parsed successfully' : `✗ ${parseResult.errors.length} error(s)`}
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Parse errors:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                {parseResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">HTML Preview</h2>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-card p-4 h-96 overflow-auto">
            <BBCodeRenderer html={parseResult.html} />
          </div>

          <details className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              View HTML source
            </summary>
            <pre className="p-4 text-xs text-gray-600 dark:text-gray-400 overflow-auto bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <code>{parseResult.html}</code>
            </pre>
          </details>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">Supported BBCode tags</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Text formatting</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[b]bold[/b]</li>
              <li>[i]italic[/i]</li>
              <li>[u]underline[/u]</li>
              <li>[s]strikethrough[/s]</li>
              <li>[color=red]color[/color]</li>
              <li>[size=150]size[/size]</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Block elements</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[quote]quote[/quote]</li>
              <li>[code]code[/code]</li>
              <li>[box=title]box[/box]</li>
              <li>[spoilerbox]spoiler box[/spoilerbox]</li>
              <li>[list][*]list[/list]</li>
              <li>[centre]center[/centre]</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Links & media</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[url=link]text[/url]</li>
              <li>[profile=ID]user[/profile]</li>
              <li>[img]image URL[/img]</li>
              <li>[youtube]video ID[/youtube]</li>
              <li>[audio]audio URL[/audio]</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BBCodeTester;
