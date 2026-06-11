/**
 * BBCode Parser for osu! style BBCode
 * Based on the official osu-web BBCodeFromDB.php so output matches the official site.
 */
import i18next from 'i18next';

// The useTranslation() hook isn't available here, so reference i18next directly
type TranslationOptions = { [key: string]: unknown } | undefined;
function t(key: string, options?: TranslationOptions): string {
  if (i18next.isInitialized) {
    try {
      return i18next.t(key, options);
    } catch {
      return key;
    }
  }
  return key;
}

// Convenience helper for translating error messages
function et(key: string, options?: TranslationOptions): string {
  return t(`${errorMessageNamespace}.${key}`, options);
}

const errorMessageNamespace = "profile.bbcodeEditor.validation";

export interface BBCodeParseResult {
  html: string;
  errors: string[];
  valid: boolean;
}

class TagValidationResult {
  success: boolean;
  message?: string;

  constructor(success: boolean, message?: string) {
    this.success = success;
    this.message = message;
  }
}

export interface BBCodeTag {
  name: string;
  openTag: string;
  closeTag: string;
  hasParam?: boolean;
  paramRequired?: boolean;
  allowNested?: boolean;
  isBlock?: boolean;  // Whether this is a block-level element
  validator?: (param?: string, content?: string) => TagValidationResult;
  renderer: (content: string, param?: string) => string;
}

export class BBCodeParser {
  private readonly tags: Map<string, BBCodeTag> = new Map();
  private readonly errors: string[] = [];

  constructor() {
    this.initializeTags();
  }

  private initializeTags(): void {
    // === Basic formatting tags ===

    // Bold
    this.addTag({
      name: 'b',
      openTag: '[b]',
      closeTag: '[/b]',
      allowNested: true,
      renderer: (content: string) => `<strong>${content}</strong>`
    });

    // Italic
    this.addTag({
      name: 'i',
      openTag: '[i]',
      closeTag: '[/i]',
      allowNested: true,
      renderer: (content: string) => `<em>${content}</em>`
    });

    // Underline
    this.addTag({
      name: 'u',
      openTag: '[u]',
      closeTag: '[/u]',
      allowNested: true,
      renderer: (content: string) => `<u>${content}</u>`
    });

    // Strikethrough - supports both [s] and [strike]
    this.addTag({
      name: 's',
      openTag: '[s]',
      closeTag: '[/s]',
      allowNested: true,
      renderer: (content: string) => `<del>${content}</del>`
    });

    this.addTag({
      name: 'strike',
      openTag: '[strike]',
      closeTag: '[/strike]',
      allowNested: true,
      renderer: (content: string) => `<del>${content}</del>`
    });

    // Color - follows the official implementation
    this.addTag({
      name: 'color',
      openTag: '[color=',
      closeTag: '[/color]',
      hasParam: true,
      paramRequired: true,
      allowNested: true,
      validator: (param?: string) => {
        if (!param) return new TagValidationResult(false, et("missingColor"));
        // Supports hex colors and HTML color names
        const hexPattern = /^#[0-9A-Fa-f]{3,6}$/;
        const htmlColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
        return new TagValidationResult(hexPattern.test(param) || htmlColors.includes(param.toLowerCase()), et("invalidColor"));
      },
      renderer: (content: string, param?: string) => `<span style="color: ${param};">${content}</span>`
    });

    // Font size - clamped to 30-200% per the official limits
    this.addTag({
      name: 'size',
      openTag: '[size=',
      closeTag: '[/size]',
      hasParam: true,
      paramRequired: true,
      allowNested: true,
      validator: (param?: string) => {
        if (!param) return new TagValidationResult(false, et("missingSize"));
        const size = parseInt(param);
        return new TagValidationResult(!isNaN(size) && size >= 30 && size <= 200, et("invalidSize"));
      },
      renderer: (content: string, param?: string) => {
        const size = Math.min(Math.max(parseInt(param || '100'), 30), 200);
        return `<span style="font-size: ${size}%;">${content}</span>`;
      }
    });

    // === Block-level elements ===

    // Center
    this.addTag({
      name: 'centre',
      openTag: '[centre]',
      closeTag: '[/centre]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div style="text-align: center;">${content}</div>`
    });

    // Heading
    this.addTag({
      name: 'heading',
      openTag: '[heading]',
      closeTag: '[/heading]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<h2>${content}</h2>`
    });

    // Notice box
    this.addTag({
      name: 'notice',
      openTag: '[notice]',
      closeTag: '[/notice]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div class="well">${content}</div>`
    });

    // Quote - follows the official implementation
    this.addTag({
      name: 'quote',
      openTag: '[quote',
      closeTag: '[/quote]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      validator: (param?: string) => {
        if (!param) return new TagValidationResult(true);

        // Must be wrapped in double quotes
        const trimmed = param.trim();
        return new TagValidationResult(trimmed.startsWith('"') && trimmed.endsWith('"'),
            et("missingQuotes"));
      },
      renderer: (content: string, param?: string) => {
        if (param) {
          // Strip the quotes
          const author = param.replace(/^"?|"?$/g, '');
          return `<blockquote><h4>${this.escapeHtml(author)} wrote:</h4>${content}</blockquote>`;
        }
        return `<blockquote>${content}</blockquote>`;
      }
    });

    // Code block
    this.addTag({
      name: 'code',
      openTag: '[code]',
      closeTag: '[/code]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<pre>${this.escapeHtml(content)}</pre>`
    });

    // Inline code
    this.addTag({
      name: 'c',
      openTag: '[c]',
      closeTag: '[/c]',
      allowNested: false,
      renderer: (content: string) => `<code>${this.escapeHtml(content)}</code>`
    });

    // Collapsible / spoiler box - follows the official implementation
    this.addTag({
      name: 'box',
      openTag: '[box',
      closeTag: '[/box]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      renderer: (content: string, param?: string) => {
        const title = param ? param.replace(/^=/, '') : 'SPOILER';
        return `<div class="js-spoilerbox bbcode-spoilerbox"><button type="button" class="js-spoilerbox__link bbcode-spoilerbox__link" style="background: none; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%;"><span class="bbcode-spoilerbox__link-icon"></span>${this.escapeHtml(title)}</button><div class="js-spoilerbox__body bbcode-spoilerbox__body">${content}</div></div>`;
      }
    });

    this.addTag({
      name: 'spoilerbox',
      openTag: '[spoilerbox]',
      closeTag: '[/spoilerbox]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div class="js-spoilerbox bbcode-spoilerbox"><button type="button" class="js-spoilerbox__link bbcode-spoilerbox__link" style="background: none; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%;"><span class="bbcode-spoilerbox__link-icon"></span>SPOILER</button><div class="js-spoilerbox__body bbcode-spoilerbox__body">${content}</div></div>`
    });

    // Inline spoiler (blacked-out text)
    this.addTag({
      name: 'spoiler',
      openTag: '[spoiler]',
      closeTag: '[/spoiler]',
      allowNested: true,
      renderer: (content: string) => `<span class="spoiler">${content}</span>`
    });

    // List - follows the official implementation
    this.addTag({
      name: 'list',
      openTag: '[list',
      closeTag: '[/list]',
      hasParam: true,
      paramRequired: false,
      // Avoid recursing over the whole block (it would break the separators);
      // the renderer recurses per item instead.
      allowNested: false,
      isBlock: true,
      renderer: (content: string, param?: string): string => {
        const items = this.splitTopLevelListItems(content);
        const liHtml = items.map((item: string) => `<li>${this.parseRecursive(item)}</li>`).join('');
        return (param && param !== '=') ? `<ol>${liHtml}</ol>` : `<ul>${liHtml}</ul>`;
      }
    });

    // === Links and media ===

    // URL link
    this.addTag({
      name: 'url',
      openTag: '[url',
      closeTag: '[/url]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string) => {
        if (!param) return new TagValidationResult(true);
        const url = param.replace(/^=/, '');
        return new TagValidationResult(/^https?:\/\/.+/.test(url), et("invalidUrl"));
      },
      renderer: (content: string, param?: string) => {
        const url = param ? param.replace(/^=/, '') : content;
        const displayText = param ? content : url;
        return `<a rel="nofollow" href="${this.escapeHtml(url)}">${this.escapeHtml(displayText)}</a>`;
      }
    });

    // Email
    this.addTag({
      name: 'email',
      openTag: '[email',
      closeTag: '[/email]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string, content?: string) => {
        const email = param ? param.replace(/^=/, '') : content;
        if (!email) return new TagValidationResult(false, et("missingEmail"));
        return new TagValidationResult(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), et("invalidEmail"));
      },
      renderer: (content: string, param?: string) => {
        const email = param ? param.replace(/^=/, '') : content;
        const displayText = param ? content : email;
        return `<a rel="nofollow" href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(displayText)}</a>`;
      }
    });

    // User profile link
    this.addTag({
      name: 'profile',
      openTag: '[profile',
      closeTag: '[/profile]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string) => {
        if (!param) return new TagValidationResult(true);
        const userId = param.replace(/^=/, '');
        return new TagValidationResult(/^\d+$/.test(userId), et("invalidUserId"));
      },
      renderer: (content: string, param?: string) => {
        if (param) {
          const userId = param.replace(/^=/, '');
          return `<a href="/users/${userId}" class="profile-link">${this.escapeHtml(content)}</a>`;
        } else {
          // No param: assume content is the username (would need resolving to a user ID)
          return `<a href="/users/${this.escapeHtml(content)}" class="profile-link">${this.escapeHtml(content)}</a>`;
        }
      }
    });

    // Image
    this.addTag({
      name: 'img',
      openTag: '[img]',
      closeTag: '[/img]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        if (!content) return new TagValidationResult(false, et("missingUrl"));
        return new TagValidationResult(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(content), et("invalidImageUrl"));
      },
      renderer: (content: string) => {
        return `<img alt="" src="${this.escapeHtml(content)}" loading="lazy" />`;
      }
    });

    // YouTube video
    this.addTag({
      name: 'youtube',
      openTag: '[youtube]',
      closeTag: '[/youtube]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        const videoId = content?.trim();
        return new TagValidationResult(!!videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId), et("invalidYouTubeVideoId"));
      },
      renderer: (content: string) => {
        const videoId = content.trim();
        return `<iframe class="u-embed-wide u-embed-wide--bbcode" src="https://www.youtube.com/embed/${this.escapeHtml(videoId)}?rel=0" allowfullscreen></iframe>`;
      }
    });

    // Audio
    this.addTag({
      name: 'audio',
      openTag: '[audio]',
      closeTag: '[/audio]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        if (!content) return new TagValidationResult(false, et("missingUrl"));
        return new TagValidationResult(/^https?:\/\/.+\.(mp3|wav|ogg|m4a)$/i.test(content), et("invalidAudioUrl"));
      },
      renderer: (content: string) => {
        return `<audio controls preload="none" src="${this.escapeHtml(content)}"></audio>`;
      }
    });

    // Image map
    this.addTag({
      name: 'imagemap',
      openTag: '[imagemap]',
      closeTag: '[/imagemap]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => {
        return this.parseImagemap(content);
      }
    });
  }

  private addTag(tag: BBCodeTag): void {
    this.tags.set(tag.name, tag);
  }

  // Split [*] only at the top level of the current list, allowing nested [list]
  private splitTopLevelListItems(source: string): string[] {
    const text = typeof source === 'string' ? source : String(source ?? '');
    const items: string[] = [];
    let depth = 1; // Starting depth for the content of the top-level [list]
    let i = 0;
    let current = '';
    const len = text.length;

    const pushCurrent = () => {
      const trimmed = current.trim();
      if (trimmed.length > 0) items.push(trimmed);
      current = '';
    };

    while (i < len) {
      const ch = text[i];
      if (ch === '[') {
        const close = text.indexOf(']', i + 1);
        if (close === -1) {
          current += ch;
          i += 1;
          continue;
        }
        const tagContent = text.slice(i + 1, close);
        const tagLower = tagContent.trim().toLowerCase();

        if (tagLower.startsWith('list')) {
          depth += 1;
          current += text.slice(i, close + 1);
          i = close + 1;
          continue;
        }
        if (tagLower === '/list') {
          depth = Math.max(0, depth - 1);
          current += text.slice(i, close + 1);
          i = close + 1;
          continue;
        }
        if (depth === 1 && tagLower === '*') {
          // Top-level item separator
          pushCurrent();
          i = close + 1;
          continue;
        }

        // Write any other tag through unchanged
        current += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }

      current += ch;
      i += 1;
    }

    pushCurrent();
    return items;
  }

  private escapeHtml(text: string): string {
    // Type guard
    if (typeof text !== 'string') {
      text = String(text || '');
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Parse the [imagemap] tag.
   * Based on the osu-web BBCodeFromDB.php implementation.
   */
  private parseImagemap(content: string): string {
    const lines = content.trim().split('\n');
    if (lines.length < 1) return '';

    const imageUrl = lines[0]?.trim();
    if (!imageUrl) return '';

    // Only an image URL and no link data: return the original BBCode (official behavior)
    if (lines.length < 2) {
      return `[imagemap]${this.escapeHtml(imageUrl)}[/imagemap]`;
    }

    const linksData = lines.slice(1);
    const links: string[] = [];

    // Parse the link data
    for (const line of linksData) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Official whitespace split, into at most 6 parts
      const parts = trimmedLine.split(' ');
      if (parts.length >= 5) {
        try {
          const left = parseFloat(parts[0]);
          const top = parseFloat(parts[1]);
          const width = parseFloat(parts[2]);
          const height = parseFloat(parts[3]);
          const href = parts[4];
          // Part 6 onward is the title (drop a leading # if present)
          let title = parts.length > 5 ? parts.slice(5).join(' ') : '';
          if (title.startsWith('#')) {
            title = title.substring(1).trim();
          }

          // Validate the numbers
          if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
            continue;
          }

          // Build the style (matching the official CSS)
          const style = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;`;

          if (href === '#') {
            // Non-link area: use a span (official approach)
            links.push(
              `<span class="imagemap__link" style="${style}" title="${this.escapeHtml(title)}"></span>`
            );
          } else {
            // Linked area: use an anchor tag (official approach)
            const safeHref = this.escapeHtml(href);
            const safeTitle = this.escapeHtml(title);
            links.push(
              `<a class="imagemap__link" href="${safeHref}" style="${style}" title="${safeTitle}"></a>`
            );
          }
        } catch {
          // Skip lines that fail to parse
          continue;
        }
      }
    }

    // Use the image filename as the alt text
    const imageUrlParts = imageUrl.split('/');
    const imageName = imageUrlParts[imageUrlParts.length - 1] || '';
    const altText = imageName.split('?')[0]; // Drop the query string

    // Build the HTML (matching the official format)
    const imageHtml = `<img class="imagemap__image" loading="lazy" src="${this.escapeHtml(imageUrl)}" width="1280" height="720" alt="${this.escapeHtml(altText)}" />`;
    const linksHtml = links.join('');

    return `<div class="imagemap">${imageHtml}${linksHtml}</div>`;
  }

  /**
   * Parse BBCode text into HTML
   */
  public parse(input: string): BBCodeParseResult {
    this.errors.length = 0;

    // Empty-input check
    if (!input || input.trim() === '') {
      return {
        html: `<div class="bbcode"></div>`,
        errors: [],
        valid: true
      };
    }

    try {
      const html = this.parseRecursive(input);
      const wrappedHtml = `<div class="bbcode">${html}</div>`;
      return {
        html: wrappedHtml,
        errors: [...this.errors],
        valid: this.errors.length === 0
      };
    } catch (error) {
      this.errors.push(et("parsingError", { error: error }));
      return {
        html: `<div class="bbcode">${this.escapeHtml(String(input))}</div>`,
        errors: [...this.errors],
        valid: false
      };
    }
  }

  private parseRecursive(input: string): string {
    // Type guard
    if (typeof input !== 'string') {
      return this.escapeHtml(String(input || ''));
    }

    let result = input;

    // Process in the official order: block-level elements first, then inline ones

    // Handle the nestable same-name block tag separately: list needs balanced matching
    result = this.processListsBalanced(result);

    // === Block-level elements ===
    const blockTags = ['imagemap', 'box', 'spoilerbox', 'code', 'notice', 'quote', 'heading'];
    for (const tagName of blockTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }

    // === Inline elements ===
    const inlineTags = ['audio', 'b', 'centre', 'c', 'color', 'email', 'img', 'i', 'size', 'spoiler', 's', 'strike', 'u', 'url', 'youtube', 'profile'];
    for (const tagName of inlineTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }

    // Auto-link bare URLs - after all other BBCode processing
    result = this.processAutoLinks(result);

    // Handle newlines last
    result = result.replace(/\n/g, '<br />');

    return result;
  }

  // Depth-balanced [list]...[/list] handling, with nesting support
  private processListsBalanced(text: string): string {
    let i = 0;
    const len = text.length;
    let out = '';

    while (i < len) {
      const startList = text.indexOf('[list', i);
      if (startList === -1) {
        out += text.slice(i);
        break;
      }
      // Copy the preceding text
      out += text.slice(i, startList);

      // Read the params up to the closing bracket
      const openBracketEnd = text.indexOf(']', startList + 1);
      if (openBracketEnd === -1) {
        // Incomplete: treat as plain text
        out += text.slice(startList);
        break;
      }

      // Extract the param (if any)
      const openContent = text.slice(startList + 1, openBracketEnd); // e.g. "list" or "list=1"
      let param: string | undefined;
      const eqIdx = openContent.indexOf('=');
      if (eqIdx !== -1) {
        param = openContent.slice(eqIdx + 1);
        // Keep it as-is (don't strip quotes) for compatibility with the existing renderer
      }

      // Scan for the matching closing [/list]
      let depth = 1;
      let j = openBracketEnd + 1;
      let closingStart = -1;
      while (j < len) {
        const nextOpen = text.indexOf('[', j);
        if (nextOpen === -1) break;
        const nextClose = text.indexOf(']', nextOpen + 1);
        if (nextClose === -1) break;
        const tagContent = text.slice(nextOpen + 1, nextClose).trim().toLowerCase();
        if (tagContent.startsWith('list')) {
          depth += 1;
        } else if (tagContent === '/list') {
          depth -= 1;
          if (depth === 0) {
            closingStart = nextOpen;
            j = nextClose + 1;
            break;
          }
        }
        j = nextClose + 1;
      }

      if (depth !== 0 || closingStart === -1) {
        // No matching close found: treat as plain text
        out += text.slice(startList);
        break;
      }

      // Complete block: content runs from openBracketEnd+1 to the closing tag's '['
      const inner = text.slice(openBracketEnd + 1, closingStart);

      // Use the existing list renderer
      const listTag = this.tags.get('list');
      if (listTag) {
        // The list renderer recurses through each item
        const rendered = listTag.renderer(inner, param ? `=${param}` : undefined);
        out += rendered;
      } else {
        // Shouldn't happen: fall back to the original text
        out += text.slice(startList, j);
      }

      // Move on
      i = j;
    }

    return out;
  }

  private processAutoLinks(text: string): string {
    // Avoid re-processing inside already-generated HTML tags or attributes
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;

    return text.replace(urlRegex, (match: string, _p: string, offset: number) => {
      // Check whether we're inside a tag (an attribute)
      const lastLt = text.lastIndexOf('<', offset);
      const lastGt = text.lastIndexOf('>', offset);

      // Inside an unclosed tag: skip
      if (lastLt > lastGt) return match;

      // Anchor element detection
      const anchorStart = text.lastIndexOf('<a', offset);
      if (anchorStart !== -1) {
        const anchorEndTag = text.indexOf('</a>', anchorStart);
        const anchorOpenEnd = text.indexOf('>', anchorStart);

        // Inside an <a>
        if (anchorOpenEnd !== -1 && anchorOpenEnd < offset && anchorEndTag !== -1 && anchorEndTag > offset) {
          return match;
        }

        // Inside an href="..." attribute value
        if (anchorOpenEnd === -1 || anchorOpenEnd > offset) return match;
      }

      // Skip auto-linking inside code/pre tag content
      const isInside = (tagName: string) => {
        const start = text.lastIndexOf(`<${tagName}`, offset);
        if (start !== -1) {
          const close = text.indexOf(`</${tagName}>`, start);
          const openEnd = text.indexOf('>', start);
          return openEnd !== -1 && openEnd < offset && close !== -1 && close > offset;
        }
        return false;
      };
      if (isInside('code') || isInside('pre')) return match;

      return `<a rel="nofollow" href="${this.escapeHtml(match)}">${this.escapeHtml(match)}</a>`;
    });
  }

  private processTag(text: string, tag: BBCodeTag): string {
    if (tag.hasParam) {
      return this.processTagWithParam(text, tag);
    } else {
      return this.processSimpleTag(text, tag);
    }
  }

  private processSimpleTag(text: string, tag: BBCodeTag): string {
    const openPattern = this.escapeRegex(tag.openTag);
    const closePattern = this.escapeRegex(tag.closeTag);
    const regex = new RegExp(`${openPattern}(.*?)${closePattern}`, 'gis');

    return text.replace(regex, (match, content) => {
      if (tag.validator) {
        const result = tag.validator(undefined, content);

        if (!result.success)
        {
          this.errors.push(et("contentValidationFailed", {
            tag: tag.name,
            message: result.message,
          }));
          return match;
        }
      }

      const processedContent = tag.allowNested ? this.parseRecursive(content) : this.escapeHtml(content);
      return tag.renderer(processedContent);
    });
  }

  private processTagWithParam(text: string, tag: BBCodeTag): string {
    // Handle tags with params, e.g. [color=red]text[/color] or [quote="author"]text[/quote]
    const patterns = [
      // [tag=param]content[/tag]
      new RegExp(`\\[${tag.name}=([^\\]]+)\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
      // [tag="param"]content[/tag]
      new RegExp(`\\[${tag.name}="([^"]+)"\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
    ];

    // If the param isn't required, also support the no-param form
    if (!tag.paramRequired) {
      patterns.push(new RegExp(`\\[${tag.name}\\](.*?)\\[\\/${tag.name}\\]`, 'gis'));
    }

    let result = text;

    for (const pattern of patterns) {
      const isNoParam = pattern.source.includes(`\\[${tag.name}\\](.*?)\\[\\/${tag.name}\\]`);
      result = result.replace(
        pattern,
        (match: string, g1: string, g2: string | number | undefined) => {
          let param: string | undefined;
          let content: string;

          if (isNoParam) {
            // No param: [tag]content[/tag] -- g1 is the content
            param = undefined;
            content = g1;
          } else {
            // With param: g1 is the param, g2 is the content
            param = g1;
            content = typeof g2 === 'string' ? g2 : '';
          }

          if (tag.validator) {
            const result = tag.validator(param, content);
            if (!result.success)
            {
              this.errors.push(et("paramValidationFailed", {
                tag: tag.name,
                param: param,
                message: result.message,
              }));
              return match;
            }
          }

          // Don't process list here
          const processedContent = tag.name === 'list'
            ? content
            : (tag.allowNested ? this.parseRecursive(content) : this.escapeHtml(content));
          return tag.renderer(processedContent, param);
        }
      );
    }

    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Create the global parser instance
export const bbcodeParser = new BBCodeParser();

// Convenience function
export function parseBBCode(input: unknown): BBCodeParseResult {
  // Make sure the input is a string
  if (typeof input !== 'string') {
    console.warn('parseBBCode: input is not a string, attempting to convert', { input, type: typeof input });
    // Try to convert to a string
    if (input === null || input === undefined) {
      input = '';
    } else {
      input = String(input);
    }
  }

  return bbcodeParser.parse(input as string);
}