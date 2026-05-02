from __future__ import annotations

import sys
from pathlib import Path


scrapper_root = Path(__file__).parent
if str(scrapper_root) not in sys.path:
    sys.path.insert(0, str(scrapper_root))
