#!/usr/bin/env python3
"""Fix indentation in roles-users-report page.tsx"""

import sys

input_file = "/Users/abhi/Desktop/BISMAN ERP/my-frontend/src/app/system/roles-users-report/page.tsx"

with open(input_file, 'r') as f:
    lines = f.readlines()

fixed_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Lines 473-885 need to have 2 spaces removed from the start
    if 473 <= line_num <= 885:
        if line.startswith('  '):  # Has at least 2 spaces
            line = line[2:]  # Remove 2 spaces
    fixed_lines.append(line)

with open(input_file, 'w') as f:
    f.writelines(fixed_lines)

print(f"Fixed {len(lines)} lines")
