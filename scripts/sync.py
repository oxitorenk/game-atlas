import os
import json
import re

def parse_markdown(file_path, image_prefix=""):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Frontmatter
    frontmatter = {}
    fm_match = re.match(r'^---(.*?)---', content, re.DOTALL)
    if fm_match:
        fm_text = fm_match.group(1)

        # Handle tags specifically
        tags_match = re.search(r'tags:\s*\n(.*?)(?=\n\w+:|$)', fm_text, re.DOTALL)
        if tags_match:
            tags = [t.strip('- ').strip() for t in tags_match.group(1).split('\n') if t.strip()]
            frontmatter['tags'] = tags
        
        # Other simple keys
        for line in fm_text.strip().split('\n'):
            if ':' in line and not line.strip().startswith('-'):
                key, val = line.split(':', 1)
                if key.strip() != 'tags':
                    frontmatter[key.strip()] = val.strip()

    # Section extraction using a split approach for better reliability
    sections = {
        'perfect': [],
        'good': [],
        'poor': [],
        'terrible': [],
        'mechanics': '',
        'uiux': ''
    }

    def get_section_content(header_pattern, text):
        match = re.search(header_pattern, text, re.IGNORECASE | re.MULTILINE)
        if not match: return ""
        start = match.end()
        
        # Find next header (# or ##) at the start of a line
        # We only want to stop at Top-level (#) or Second-level (##) headers
        # We should NOT stop at Third-level (###) headers as they are part of the content
        next_match = re.search(r'^#{1,2}\s', text[start:], re.MULTILINE)
        
        if next_match:
            return text[start:start+next_match.start()].strip()
        
        return text[start:].strip()

    def parse_wikilinks(text):
        if not text: return ""

        # Convert [[#Header|Label]] to <a href="#Header" class="wiki-link">Label</a>
        text = re.sub(r'\[\[#([^|\]]+)\|([^\]]+)\]\]', r'<a href="#\1" class="wiki-link">\2</a>', text)

        # Convert [[#Header]] to <a href="#Header" class="wiki-link">Header</a>
        text = re.sub(r'\[\[#([^\]]+)\]\]', r'<a href="#\1" class="wiki-link">\1</a>', text)

        return text

    def parse_list(text):
        lines = text.split('\n')
        root_items = []
        stack = [] # (indent_level, item_list)

        for line in lines:
            if not line.strip():
                continue
                
            # Calculate indentation (count tabs or spaces)
            match = re.match(r'^(\s*)[-*]\s+(.*)', line)
            if match:
                indent = len(match.group(1).replace('\t', '    ')) # Normalize tabs to 4 spaces
                content = parse_wikilinks(match.group(2).strip())
                new_item = {"text": content, "children": []}
                
                # Manage stack based on indentation
                while stack and stack[-1][0] >= indent:
                    stack.pop()
                
                if not stack:
                    root_items.append(new_item)
                    stack.append((indent, new_item["children"]))
                else:
                    stack[-1][1].append(new_item)
                    stack.append((indent, new_item["children"]))
            else:
                # Handle non-bullet lines as part of root if they appear (legacy/edge case)
                if not root_items or isinstance(root_items[-1], dict):
                    root_items.append(parse_wikilinks(line.strip()))
                
        # Clean up: if no children, convert back to simple string if preferred, 
        # or keep structure for consistency. Frontend will need to handle both
        # for backward compatibility or we migrate everything here.
        # Let's keep it consistent: if no children, just return the text string for simplicity 
        # in common cases, but if children exist, return the dict.
        
        def simplify(items):
            result = []
            for item in items:
                if isinstance(item, dict):
                    if not item["children"]:
                        result.append(item["text"])
                    else:
                        item["children"] = simplify(item["children"])
                        result.append(item)
                else:
                    result.append(item)
            return result

        return simplify(root_items)

    def parse_structured_section(text, keep_text=True):
        if not text: return []
        
        # Split by sub-headers (###)
        sub_sections = []
        
        # Find all sections starting with ###
        matches = list(re.finditer(r'^###\s*(.*)', text, re.MULTILINE))
        
        if not matches:
            # If no sub-headers, treat the whole thing as one anonymous section
            # Standard Markdown images
            images_std = re.findall(r'!\[(.*?)\]\((.*?)\)', text)
            # Obsidian Wikilink images
            images_wiki = re.findall(r'!\[\[(.*?)\]\]', text)
            
            all_images = [img[1] for img in images_std] + [img for img in images_wiki]
            # Prefix them
            all_images = [f"{image_prefix}/{img}" if image_prefix else img for img in all_images]

            # Remove image markdown to get clean text
            clean_text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
            clean_text = re.sub(r'!\[\[.*?\]\]', '', clean_text).strip()

            if clean_text or all_images:
                return [{
                    "title": "", 
                    "text": parse_wikilinks(clean_text) if keep_text else "", 
                    "images": all_images
                }]
            return []
            
        for i, match in enumerate(matches):
            title = match.group(1).strip()
            start = match.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            content = text[start:end].strip()
            
            # Extract both types of images
            images_std = re.findall(r'!\[(.*?)\]\((.*?)\)', content)
            images_wiki = re.findall(r'!\[\[(.*?)\]\]', content)
            
            all_images = [img[1] for img in images_std] + [img for img in images_wiki]
            # Prefix them
            all_images = [f"{image_prefix}/{img}" if image_prefix else img for img in all_images]

            # Remove image markdown to get clean text
            clean_text = re.sub(r'!\[.*?\]\(.*?\)', '', content)
            clean_text = re.sub(r'!\[\[.*?\]\]', '', clean_text).strip()
            
            sub_sections.append({
                "title": title,
                "text": parse_wikilinks(clean_text) if keep_text else "",
                "images": all_images
            })
            
        return sub_sections

    sections['perfect'] = parse_list(get_section_content(r'## Mükemmel[ \t]*\n', content))
    sections['good'] = parse_list(get_section_content(r'## İyi[ \t]*\n', content))
    sections['poor'] = parse_list(get_section_content(r'## Kötü[ \t]*\n', content))
    sections['terrible'] = parse_list(get_section_content(r'## Berbat[ \t]*\n', content))
    sections['mechanics'] = parse_structured_section(get_section_content(r'# Mekanikler[ \t]*\n', content))
    sections['uiux'] = parse_structured_section(get_section_content(r'# UI / UX[ \t]*\n', content), keep_text=False)

    return {**frontmatter, **sections}


def main():
    # Use relative path from script location
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    base_dir = os.path.join(root_dir, 'Game Atlas', 'Games')
    games = []

    if not os.path.exists(base_dir):
        print(f"Error: Base directory not found at {base_dir}")
        return

    for game_folder in os.listdir(base_dir):
        folder_path = os.path.join(base_dir, game_folder)
        if not os.path.isdir(folder_path):
            continue

        review_path = os.path.join(folder_path, 'Review.md')
        if os.path.exists(review_path):
            image_prefix = f"Game Atlas/Games/{game_folder}/Sources"
            game_data = parse_markdown(review_path, image_prefix=image_prefix)
            game_data['id'] = game_folder.lower().replace(' ', '-')
            game_data['name'] = game_folder
            
            # Look for images in Sources
            sources_dir = os.path.join(folder_path, 'Sources')
            if os.path.exists(sources_dir):
                for f in os.listdir(sources_dir):
                    if 'hero' in f.lower():
                        game_data['hero'] = f"Game Atlas/Games/{game_folder}/Sources/{f}"
                    if 'thumb' in f.lower() or 'icon' in f.lower():
                        game_data['thumbnail'] = f"Game Atlas/Games/{game_folder}/Sources/{f}"
            
            games.append(game_data)

    output_path = os.path.join(root_dir, 'data', 'data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(games, f, indent=2, ensure_ascii=False)
    
    print(f"Synced {len(games)} games to {output_path}")

if __name__ == "__main__":
    main()
