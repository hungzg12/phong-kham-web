import os
import re

print("=== AUDIT OF ALL FORM INPUTS AND MANUAL TYPING IN PHONG-KHAM-WEB/SRC ===")
files_data = []

target_dir = 'src' if os.path.exists('src') else 'phong-kham-web/src'
for root, dirs, files in os.walk(target_dir):
    for file in files:
        if file.endswith(('.jsx', '.tsx')):
            path = os.path.join(root, file)
            with open(path, encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Find all inputs
            inputs = re.findall(r'<input\s+([^>]+)>', content)
            text_inputs = []
            for inp in inputs:
                # check if type is text or no type (defaults to text) or search or tel
                type_match = re.search(r'type=[\'"]([^\'"]+)[\'"]', inp)
                typ = type_match.group(1) if type_match else 'text'
                if typ in ('text', 'search', 'tel', 'email', 'url'):
                    # get name, placeholder, or aria-label
                    name_m = re.search(r'(?:name|placeholder|aria-label)=[\'"]([^\'"]+)[\'"]', inp)
                    label = name_m.group(1) if name_m else inp[:40]
                    text_inputs.append(label)
            
            textareas = re.findall(r'<textarea\s+([^>]+)>', content)
            ta_labels = []
            for ta in textareas:
                name_m = re.search(r'(?:name|placeholder|aria-label)=[\'"]([^\'"]+)[\'"]', ta)
                label = name_m.group(1) if name_m else ta[:40]
                ta_labels.append(label)
                
            suggests = re.findall(r'<MedicalSuggestInput\s+([^>]+)>', content)
            sugg_labels = []
            for s in suggests:
                type_m = re.search(r'type=[\'"]([^\'"]+)[\'"]', s)
                label = type_m.group(1) if type_m else s[:40]
                sugg_labels.append(label)
                
            selects = re.findall(r'<select\s+([^>]+)>', content)
            
            if text_inputs or ta_labels or sugg_labels:
                files_data.append({
                    'file': file,
                    'path': path,
                    'text_inputs': text_inputs,
                    'textareas': ta_labels,
                    'suggests': sugg_labels,
                    'selects_count': len(selects)
                })

for item in sorted(files_data, key=lambda x: len(x['text_inputs']) + len(x['textareas']), reverse=True):
    total_manual = len(item['text_inputs']) + len(item['textareas'])
    print(f"\n[{item['file']}] Total manual typing fields: {total_manual} | Suggest fields: {len(item['suggests'])} | Selects: {item['selects_count']}")
    if item['text_inputs']:
        print("   - Inputs: " + ", ".join(item['text_inputs'][:8]) + ("..." if len(item['text_inputs']) > 8 else ""))
    if item['textareas']:
        print("   - Textareas: " + ", ".join(item['textareas'][:5]))
    if item['suggests']:
        print("   - MedicalSuggestInput: " + ", ".join(item['suggests'][:5]))
