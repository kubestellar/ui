import os
import re
import json

backend_dir = "./backend"  # Adjust this if needed

def extract_go_symbols(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    results = []
    func_matches = re.finditer(r'(//.*\n)*\s*func\s+(\(.*?\)\s+)?(\w+)\s*\((.*?)\)', content)
    for match in func_matches:
        doc = match.group(1).strip() if match.group(1) else ""
        func_name = match.group(3)
        params = match.group(4)
        results.append({
            "type": "function",
            "name": func_name,
            "params": params,
            "doc": doc,
            "source_file": file_path
        })
    struct_matches = re.finditer(r'(//.*\n)*\s*type\s+(\w+)\s+struct\s*{', content)
    for match in struct_matches:
        doc = match.group(1).strip() if match.group(1) else ""
        struct_name = match.group(2)
        results.append({
            "type": "struct",
            "name": struct_name,
            "params": "",
            "doc": doc,
            "source_file": file_path
        })
    return results

go_chunks = []
for root, _, files in os.walk(backend_dir):
    for file in files:
        if file.endswith(".go"):
            file_path = os.path.join(root, file)
            go_chunks.extend(extract_go_symbols(file_path))

with open("kubestellar_go_chunks.json", "w", encoding="utf-8") as f:
    json.dump(go_chunks, f, indent=2)
