"""
Cognee Knowledge Graph Bridge for Researchie
Extracts semantic relationships between research atoms (quotes, PDF highlights, notes).
"""

import sys
import json
import os
import asyncio

async def test_cognee():
    try:
        import cognee
        print("[Cognee] Successfully imported cognee v" + getattr(cognee, "__version__", "installed"))
        return True
    except Exception as e:
        print(f"[Cognee Error] {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_cognee())
