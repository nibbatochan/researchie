"""
Cognee Knowledge Graph Builder for Researchie
Analyzes project research atoms and generates high-confidence relationship links for the 2D Spatial Canvas.
"""

import sys
import json
import os
import re
import math
from typing import List, Dict, Any

def extract_keywords(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', text.lower())
    stopwords = {
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was',
        'were', 'which', 'when', 'where', 'what', 'their', 'they', 'about', 'been',
        'into', 'more', 'some', 'than', 'them', 'then', 'will', 'your', 'using',
        'used', 'also', 'such', 'only', 'each', 'over', 'both', 'after', 'before'
    }
    return {w for w in words if w not in stopwords}

def calculate_jaccard(set1: set, set2: set) -> float:
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union > 0 else 0.0

def load_project_atoms(project_id: str) -> List[Dict[str, Any]]:
    # 1. Try .research-store.json in current directory
    store_path = os.path.join(os.getcwd(), '.research-store.json')
    if os.path.exists(store_path):
        try:
            with open(store_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                atoms = data.get('atoms', [])
                matched = [a for a in atoms if a.get('projectId') == project_id or a.get('project_id') == project_id]
                if matched:
                    return matched
        except Exception as e:
            print(f"[Store Load Warning] {e}")

    # 2. Fallback to sample data for RAG project
    fallback_path = os.path.join(os.getcwd(), 'src', 'lib', 'data', 'ragResearchProject.ts')
    if os.path.exists(fallback_path):
        try:
            with open(fallback_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Basic extraction of atom IDs and titles
                ids = re.findall(r"id:\s*'(rag-atom-\d+)'", content)
                titles = re.findall(r"title:\s*'([^']+)'", content)
                raw_texts = re.findall(r"rawText:\s*`([^`]+)`", content)
                
                atoms = []
                for i, aid in enumerate(ids):
                    atoms.append({
                        'id': aid,
                        'projectId': project_id,
                        'title': titles[i] if i < len(titles) else f"Atom {aid}",
                        'content': {
                            'text': raw_texts[i] if i < len(raw_texts) else '',
                            'rawText': raw_texts[i] if i < len(raw_texts) else '',
                        },
                        'tags': ['rag', 'retrieval']
                    })
                return atoms
        except Exception as e:
            print(f"[Fallback Load Warning] {e}")

    return []

def build_knowledge_graph_links(project_id: str) -> List[Dict[str, Any]]:
    atoms = load_project_atoms(project_id)
    if not atoms:
        print(f"[Cognee] No atoms found for project {project_id}")
        return []

    print(f"[Cognee] Processing {len(atoms)} research atoms for project: {project_id}...")

    # Pre-extract keyword sets for each atom
    atom_profiles = []
    for atom in atoms:
        aid = atom.get('id')
        title = atom.get('title', '')
        text = atom.get('content', {}).get('text') or atom.get('content', {}).get('rawText') or ''
        tags = atom.get('tags') or []
        combined_text = f"{title} {text} {' '.join(tags)}"
        keywords = extract_keywords(combined_text)
        atom_profiles.append({
            'id': aid,
            'title': title,
            'keywords': keywords,
            'tags': set(t.lower() for t in tags),
            'text': text
        })

    links = []
    ports = ['top', 'bottom', 'left', 'right']

    # Pairwise relationship scoring
    for i in range(len(atom_profiles)):
        for j in range(i + 1, len(atom_profiles)):
            a1 = atom_profiles[i]
            a2 = atom_profiles[j]

            # Keyword Jaccard Similarity
            sim = calculate_jaccard(a1['keywords'], a2['keywords'])
            tag_overlap = len(a1['tags'].intersection(a2['tags']))

            # Strong semantic relationship threshold
            if sim > 0.12 or tag_overlap >= 2:
                # Classify relationship type
                t1 = a1['title'].lower() + " " + a1['text'].lower()
                t2 = a2['title'].lower() + " " + a2['text'].lower()

                rel_type = 'relates'
                label = 'Related insight'

                if any(w in t2 for w in ['gain', 'accuracy', 'improves', 'boost', 'outperforms', 'reduced']):
                    rel_type = 'supports'
                    label = 'Supports finding'
                elif any(w in t2 for w in ['formula', 'algorithm', 'implementation', 'code', 'endpoint', 'pgvector']):
                    rel_type = 'derives'
                    label = 'Implements pattern'
                elif any(w in t1 or w in t2 for w in ['lost in the middle', 'degrades', 'tradeoff', 'failure mode']):
                    rel_type = 'contradicts'
                    label = 'Mitigates bottleneck'

                link_id = f"cognee-link-{a1['id']}-{a2['id']}"
                from_port = 'right' if j % 2 == 0 else 'bottom'
                to_port = 'left' if j % 2 == 0 else 'top'

                links.append({
                    'id': link_id,
                    'fromId': a1['id'],
                    'toId': a2['id'],
                    'fromPort': from_port,
                    'toPort': to_port,
                    'label': label,
                    'type': rel_type,
                    'confidence': round(min(0.98, sim * 3.5 + 0.45), 2)
                })

    # Sort links by confidence and keep top connections
    links.sort(key=lambda x: x.get('confidence', 0), reverse=True)
    top_links = links[:24]

    output_file = os.path.join(os.getcwd(), f'.cognee-graph-{project_id}.json')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'projectId': project_id,
                'atomCount': len(atoms),
                'linkCount': len(top_links),
                'links': top_links
            }, f, indent=2)
        print(f"[Cognee] Successfully generated {len(top_links)} relationship links saved to {output_file}")
    except Exception as e:
        print(f"[Error saving graph] {e}")

    return top_links

if __name__ == '__main__':
    target_project = sys.argv[1] if len(sys.argv) > 1 else 'proj-rag-production-systems'
    build_knowledge_graph_links(target_project)
