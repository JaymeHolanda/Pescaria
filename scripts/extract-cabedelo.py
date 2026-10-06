"""Extract the eight calendar columns per page of the CHM 2026 PDF.

Print JSON for review; the resulting checked-in data needs no browser PDF parser.
"""
import calendar
import json
import re
import sys
from pypdf import PdfReader

days = {}
for page_index, page in enumerate(PdfReader(sys.argv[1]).pages):
    lines = page.extract_text(extraction_mode="layout").splitlines()
    header = next(line for line in lines if line.count("HORA") == 8)
    starts = [max(0, m.start() - 9) for m in re.finditer("HORA", header)]
    current = [None] * 8
    for line in lines[lines.index(header) + 1:]:
        for column, start in enumerate(starts):
            cell = line[start:starts[column + 1] if column < 7 else len(line)]
            pairs = re.findall(r"\b(\d{4})\s+(-?\d+\.\d{2})\b", cell)
            if not pairs:
                continue
            day_match = re.match(r"\s*(\d{2})\s+\d{4}", cell)
            if day_match:
                current[column] = int(day_match[1])
            assert current[column] is not None, cell
            month = page_index * 4 + column // 2 + 1
            date = f"2026-{month:02d}-{current[column]:02d}"
            for hour, level in pairs:
                assert int(hour[:2]) < 24 and int(hour[2:]) < 60
                days.setdefault(date, []).append([hour[:2] + ":" + hour[2:], float(level)])
assert len(days) == 365, len(days)
for month in range(1, 13):
    for day in range(1, calendar.monthrange(2026, month)[1] + 1):
        events = days[f"2026-{month:02d}-{day:02d}"]
        assert 3 <= len(events) <= 4, (month, day, events)
        assert events == sorted(events), (month, day, events)
print(json.dumps(dict(sorted(days.items())), separators=(",", ":")))
