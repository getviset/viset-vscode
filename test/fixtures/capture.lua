-- Fixture source boundary:
-- - src/assets/Scaffold/capture.lua at Viset 370ef7b656378487486a498589cac6419cfcd861
-- - examples/medium/home-scroll.lua at the same commit
-- The released forms are copied below and extended only with focused colourization cases.

--[[
# viset
version = 1
output = "{{OUTPUT_PATH}}"
browser_arguments = []

bare_key = 42
"quoted key" = "quoted value"
dotted.key = true
basic_string = "basic"
literal_string = 'literal'
multiline_basic = """
basic line
"""
multiline_literal = '''
literal line
'''
integer_value = 123
float_value = 3.14
boolean_value = false
array_value = [1, 2, 3]
inline_table = { enabled = true, label = "inline" }

[standard.table]
value = true

[[array.table]]
name = "first"

[devices.desktop]
mobile = false
touch = false
device_scale = 1.0

[devices.desktop.viewport]
width = {{VIEWPORT_WIDTH}}
height = {{VIEWPORT_HEIGHT}}

[data]
url = "{{PAGE_URL}}"
]]

local url = viset.context.data.url
---@cast url string

viset.page.navigate(url)

viset.page.wait_for(viset.javascript [=[
  document.readyState === "complete"
]=], "10s")

viset.page.wait_for(viset.javascript("document.readyState === 'complete'"), "10s")
local parenthesized = viset.javascript([=[
  const parenthesizedLong = true;
]=])
local ordinary = viset.javascript 'const ordinaryDirect = true;'

local value = 1 -- prefix_key = true # viset
--[=[block_prefix = true # viset
block_value = 2
]=]
--[=[
earlier_block_content = "left as Lua comment syntax"
later_marker = true # viset
marker_forward_value = 3
]=]

local marker_text = "-- prefix_key = true # viset in a Lua string"
local payload = "const variablePayload = true;"
-- marker-free comment
--[[
marker_free_block = true
]]
local alias = viset.javascript
alias("const aliasPayload = true;")
viset["javascript"]("const computedPayload = true;")
viset.javascript(payload)
other.javascript("const unrelatedPayload = true;")

viset.snapshot()
