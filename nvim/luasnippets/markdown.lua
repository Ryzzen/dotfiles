-- Markdown snippets for READMEs, docs and pentest reports. friendly-snippets
-- already provides the basics (codeblock, table, note/warning callouts, task,
-- img…); these are the larger skeletons it lacks.
local ls = require("luasnip")
local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node
local c = ls.choice_node
local f = ls.function_node
local fmta = require("luasnip.extras.fmt").fmta

local today = function()
	return os.date("%Y-%m-%d")
end

local git_user = function()
	return (vim.fn.system({ "git", "config", "user.name" }):gsub("\n", ""))
end

-- <C-l> cycles the language choice.
local lang = function(pos)
	return c(
		pos,
		{ t("bash"), t("console"), t("c"), t("python"), t("nix"), t("http"), t("diff"), t("text"), i(nil, "lang") }
	)
end

ls.add_snippets("markdown", {
	s(
		{ trig = "cb", desc = "Fenced code block (<C-l> cycles language)" },
		fmta(
			[[
```<>
<>
```
]],
			{ lang(1), i(0) }
		)
	),

	s(
		{ trig = "det", desc = "Collapsible <details> section" },
		fmta(
			[[
<<details>>
<<summary>><><</summary>>

<>

<</details>>
]],
			{ i(1, "Click to expand"), i(0) }
		)
	),

	s({ trig = "kbd", desc = "<kbd> key" }, fmta("<<kbd>><><</kbd>>", { i(1) })),

	s(
		{ trig = "fm", desc = "YAML front matter (pandoc)" },
		fmta(
			[[
---
title: "<>"
author: "<>"
date: <>
---

<>
]],
			{ i(1), f(git_user), f(today), i(0) }
		)
	),

	s(
		{ trig = "readme", desc = "README skeleton" },
		fmta(
			[[
# <>

<>

## Requirements

- <>

## Installation

```bash
<>
```

## Usage

```bash
<>
```

## License

<>
]],
			{ i(1, "project"), i(2, "One-paragraph summary of what this does and why."), i(3), i(4), i(5), i(0, "MIT") }
		)
	),

	s(
		{ trig = "finding", desc = "Pentest finding" },
		fmta(
			[[
### <> — <>

| Severity | CVSS 3.1 | Status |
| -------- | -------- | ------ |
| <>       | <>       | <>     |

**Affected:** <>

#### Description

<>

#### Impact

<>

#### Reproduction

1. <>

#### Remediation

<>

#### References

- <>
]],
			{
				i(1, "VULN-01"),
				i(2, "Title"),
				c(3, { t("Critical"), t("High"), t("Medium"), t("Low"), t("Info") }),
				i(4, "0.0 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N)"),
				c(5, { t("Open"), t("Fixed"), t("Accepted risk") }),
				i(6, "host / endpoint / component"),
				i(7),
				i(8),
				i(9),
				i(10),
				i(0),
			}
		)
	),

	s(
		{ trig = "req", desc = "HTTP request / response evidence" },
		fmta(
			[[
**Request**

```http
<> <> HTTP/1.1
Host: <>

<>
```

**Response**

```http
HTTP/1.1 <>

<>
```
]],
			{
				c(1, { t("GET"), t("POST"), t("PUT"), t("DELETE"), t("PATCH") }),
				i(2, "/"),
				i(3),
				i(4),
				i(5, "200 OK"),
				i(0),
			}
		)
	),
})
