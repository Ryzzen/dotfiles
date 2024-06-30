return {
  "akinsho/bufferline.nvim",
  config = function()
    require("bufferline").setup{
      options = {
          mode = "tabs",
          separator_style = "thin",
        },
    }
  end
}
