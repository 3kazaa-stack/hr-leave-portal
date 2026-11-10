# ASH Security Scan Report

- **Report generated**: 2026-11-10T21:15:38+00:00
- **Time since scan**: 1 minute

## Scan Metadata

- **Project**: ASH
- **Scan executed**: 2026-11-10T21:14:24+00:00
- **ASH version**: 3.7.0

## Summary

### Scanner Results

The table below shows findings by scanner, with status based on severity thresholds and dependencies:

- **Severity levels**:
  - **Suppressed (S)**: Findings that have been explicitly suppressed and don't affect scanner status
  - **Critical (C)**: Highest severity findings that require immediate attention
  - **High (H)**: Serious findings that should be addressed soon
  - **Medium (M)**: Moderate risk findings
  - **Low (L)**: Lower risk findings
  - **Info (I)**: Informational findings with minimal risk
- **Duration (Time)**: Time taken by the scanner to complete its execution
- **Actionable**: Number of findings at or above the threshold severity level that require attention
- **Result**:
  - **PASSED** = No findings at or above threshold
  - **FAILED** = Findings at or above threshold
  - **MISSING** = Required dependencies not available
  - **SKIPPED** = Scanner explicitly disabled
  - **ERROR** = Scanner execution error
- **Threshold**: The minimum severity level that will cause a scanner to fail
  - Thresholds: ALL, LOW, MEDIUM, HIGH, CRITICAL
  - Source: Values in parentheses indicate where the threshold is set:
    - `global` (global_settings section in the ASH_CONFIG used)
    - `config` (scanner config section in the ASH_CONFIG used)
    - `scanner` (default configuration in the plugin, if explicitly set)
- **Statistics calculation**:
  - All statistics are calculated from the final aggregated SARIF report
  - Suppressed findings are counted separately and do not contribute to actionable findings
  - Scanner status is determined by comparing actionable findings to the threshold

| Scanner | Suppressed | Critical | High | Medium | Low | Info | Actionable | Result | Threshold |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bandit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | PASSED | MEDIUM (global) |
| cdk-nag | 0 | 0 | 0 | 0 | 0 | 0 | 0 | MISSING | MEDIUM (global) |
| cfn-nag | 0 | 0 | 0 | 0 | 0 | 0 | 0 | MISSING | MEDIUM (global) |
| checkov | 0 | 0 | 0 | 0 | 0 | 0 | 0 | PASSED | MEDIUM (global) |
| detect-secrets | 0 | 9 | 0 | 0 | 0 | 0 | 9 | FAILED | MEDIUM (global) |
| grype | 0 | 0 | 0 | 0 | 0 | 0 | 0 | MISSING | MEDIUM (global) |
| npm-audit | 0 | 0 | 0 | 10 | 0 | 0 | 10 | FAILED | MEDIUM (global) |
| opengrep | 0 | 0 | 0 | 0 | 0 | 0 | 0 | MISSING | MEDIUM (global) |
| semgrep | 0 | 0 | 0 | 0 | 0 | 0 | 0 | PASSED | MEDIUM (global) |
| syft | 0 | 0 | 0 | 0 | 0 | 0 | 0 | MISSING | MEDIUM (global) |

### Top 10 Hotspots

Files with the highest number of security findings:

| Finding Count | File Location |
| ---: | --- |
| 9 | src/i18n/en.json |
| 1 | node_modules/@eslint/config-array/package.json |
| 1 | node_modules/@eslint/js/package.json |
| 1 | node_modules/@typescript-eslint/eslint-plugin/package.json |
| 1 | node_modules/@typescript-eslint/parser/package.json |
| 1 | node_modules/@typescript-eslint/type-utils/package.json |
| 1 | node_modules/@typescript-eslint/typescript-estree/package.json |
| 1 | node_modules/@typescript-eslint/utils/package.json |
| 1 | node_modules/eslint/package.json |
| 1 | node_modules/minimatch/package.json |

<h2>Detailed Findings</h2>

<details>
<summary>Show 19 actionable findings</summary>

### Finding 1: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:175

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 175

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 2: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:176

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 176

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 3: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:155

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 155

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 4: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:160

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 160

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 5: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:156

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 156

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 6: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:177

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 177

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 7: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:157

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 157

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 8: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:173

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 173

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 9: SECRET-SECRET-KEYWORD

- **Severity**: HIGH
- **Scanner**: detect-secrets
- **Rule ID**: SECRET-SECRET-KEYWORD
- **Location**: src/i18n/en.json:154

**Description**:
Secret of type 'Secret Keyword' detected in file 'src/i18n/en.json' at line 154

**Code Snippet**:
```
Secret of type Secret Keyword detected
```

---

### Finding 10: npm-audit-transitive-@eslint/config-array

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@eslint/config-array
- **Location**: node_modules/@eslint/config-array/package.json:1

**Description**:
Transitive vulnerability in @eslint/config-array (via minimatch) >=0.23.0

---

### Finding 11: npm-audit-transitive-@eslint/js

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@eslint/js
- **Location**: node_modules/@eslint/js/package.json:1

**Description**:
Transitive vulnerability in @eslint/js (via eslint) >=10.0.1

---

### Finding 12: npm-audit-transitive-@typescript-eslint/eslint-plugin

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@typescript-eslint/eslint-plugin
- **Location**: node_modules/@typescript-eslint/eslint-plugin/package.json:1

**Description**:
Transitive vulnerability in @typescript-eslint/eslint-plugin (via @typescript-eslint/type-utils, @typescript-eslint/utils) 6.16.0 - 8.72.2

---

### Finding 13: npm-audit-transitive-@typescript-eslint/parser

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@typescript-eslint/parser
- **Location**: node_modules/@typescript-eslint/parser/package.json:1

**Description**:
Transitive vulnerability in @typescript-eslint/parser (via @typescript-eslint/typescript-estree) 6.16.0 - 8.72.2

---

### Finding 14: npm-audit-transitive-@typescript-eslint/type-utils

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@typescript-eslint/type-utils
- **Location**: node_modules/@typescript-eslint/type-utils/package.json:1

**Description**:
Transitive vulnerability in @typescript-eslint/type-utils (via @typescript-eslint/typescript-estree, @typescript-eslint/utils) 6.16.0 - 8.72.2

---

### Finding 15: npm-audit-transitive-@typescript-eslint/typescript-estree

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@typescript-eslint/typescript-estree
- **Location**: node_modules/@typescript-eslint/typescript-estree/package.json:1

**Description**:
Transitive vulnerability in @typescript-eslint/typescript-estree (via minimatch) 6.16.0 - 8.72.2

---

### Finding 16: npm-audit-transitive-@typescript-eslint/utils

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-@typescript-eslint/utils
- **Location**: node_modules/@typescript-eslint/utils/package.json:1

**Description**:
Transitive vulnerability in @typescript-eslint/utils (via @typescript-eslint/typescript-estree) 6.16.0 - 8.72.2

---

### Finding 17: npm-audit-transitive-eslint

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-eslint
- **Location**: node_modules/eslint/package.json:1

**Description**:
Transitive vulnerability in eslint (via @eslint/config-array, minimatch) >=10.0.0-alpha.0

---

### Finding 18: GHSA-g3hv-75wg-m249

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: GHSA-g3hv-75wg-m249
- **Location**: node_modules/minimatch/package.json:1

**Description**:
minimatch has potential denial of service via globparts amplification in minimatch 7.0.0 - 11.0.0. https://github.com/advisories/GHSA-g3hv-75wg-m249

---

### Finding 19: npm-audit-transitive-typescript-eslint

- **Severity**: MEDIUM
- **Scanner**: npm-audit
- **Rule ID**: npm-audit-transitive-typescript-eslint
- **Location**: node_modules/typescript-eslint/package.json:1

**Description**:
Transitive vulnerability in typescript-eslint (via @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/typescript-estree, @typescript-eslint/utils) <=8.72.2

</details>

---

*Report generated by [Automated Security Helper (ASH)](https://github.com/awslabs/automated-security-helper) at 2026-11-10T21:15:38+00:00*