import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';

interface BBCodeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BBCodeHelpModal: React.FC<BBCodeHelpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const bbcodeTags = [
    {
      category: 'Text formatting',
      tags: [
        { tag: '[b]bold[/b]', description: 'Bold text', example: '**bold**' },
        { tag: '[i]italic[/i]', description: 'Italic text', example: '*italic*' },
        { tag: '[u]underline[/u]', description: 'Underlined text', example: 'underlined text' },
        { tag: '[strike]strikethrough[/strike]', description: 'Strikethrough text', example: '~~strikethrough~~' },
        { tag: '[spoiler]spoiler[/spoiler]', description: 'Spoiler bar, revealed on hover', example: '███████' },
      ]
    },
    {
      category: 'Color and size',
      tags: [
        { tag: '[color=red]red[/color]', description: 'Colored text', example: 'red text' },
        { tag: '[color=#ff0000]red[/color]', description: 'Hex color', example: 'red text' },
        { tag: '[size=150]large[/size]', description: 'Font size (50, 85, 100, 150)', example: 'large text' },
      ]
    },
    {
      category: 'Layout',
      tags: [
        { tag: '[centre]centered[/centre]', description: 'Center alignment', example: 'centered text' },
        { tag: '[heading]heading[/heading]', description: 'Large heading', example: '# heading' },
        { tag: '[quote]quote[/quote]', description: 'Quote block', example: '> quoted content' },
        { tag: '[quote="author"]quote[/quote]', description: 'Quote with an author', example: '> author: quoted content' },
      ]
    },
    {
      category: 'Lists',
      tags: [
        { tag: '[list]\n[*]Item 1\n[*]Item 2\n[/list]', description: 'Unordered list', example: '• Item 1\n• Item 2' },
        { tag: '[list=1]\n[*]Item 1\n[*]Item 2\n[/list]', description: 'Ordered list', example: '1. Item 1\n2. Item 2' },
      ]
    },
    {
      category: 'Code',
      tags: [
        { tag: '[c]inline code[/c]', description: 'Inline code', example: '`code`' },
        { tag: '[code]\ncode block\n[/code]', description: 'Code block', example: '```\ncode block\n```' },
      ]
    },
    {
      category: 'Links and media',
      tags: [
        { tag: '[url=link]text[/url]', description: 'Link', example: 'link text' },
        { tag: '[profile=123456]user[/profile]', description: 'User profile link', example: 'user link' },
        { tag: '[email=address]email[/email]', description: 'Email link', example: 'email link' },
        { tag: '[img]image URL[/img]', description: 'Insert an image', example: '[image]' },
        { tag: '[youtube]video ID[/youtube]', description: 'YouTube video', example: '[video]' },
        { tag: '[audio]audio URL[/audio]', description: 'Audio player', example: '[audio]' },
      ]
    },
    {
      category: 'Interactive elements',
      tags: [
        { tag: '[box=title]content[/box]', description: 'Collapsible box', example: '▼ title' },
        { tag: '[spoilerbox]content[/spoilerbox]', description: 'Spoiler box', example: '▼ SPOILER' },
        { tag: '[notice]notice[/notice]', description: 'Notice box', example: '⚠️ important notice' },
        {
          tag: '[imagemap]\nimage URL\n10.0 10.0 30.0 20.0 https://example.com link title\n25.0 40.0 50.0 30.0 # area with no link\n[/imagemap]',
          description: 'Image map - create clickable areas on an image. Format: X Y width height link title (percentage coordinates)',
          example: '[interactive image]'
        },
      ]
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            BBCode tag help
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('profile.userPage.bbcodeDescription')}
            </div>

            {bbcodeTags.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.tags.map((tag, tagIndex) => (
                    <div key={tagIndex} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
                      <div>
                        <div className="text-sm font-mono text-gray-800 dark:text-gray-200 mb-1">
                          {tag.tag}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {tag.description}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Preview:</div>
                        <div className="whitespace-pre-line">{tag.example}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Tips
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Tags can be nested, e.g. [b][i]bold italic[/i][/b]</li>
                <li>• Tags must be paired, with matching opening and closing tags</li>
                <li>• Some tags such as [color] and [size] require a parameter</li>
                <li>• Use the toolbar buttons to insert tags quickly</li>
                <li>• {t('profile.userPage.usePreview')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-osu-pink hover:opacity-90 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BBCodeHelpModal;