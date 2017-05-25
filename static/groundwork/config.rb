# Set this to the root of your project
http_path = "/"
css_dir = "css"
sass_dir = "src/sass"
images_dir = "images"
javascripts_dir = "js"
fonts_dir = "fonts"

output_style = :expanded
environment = :development

# To enable debug info. Uncomment:
# if environment != :production
#   sass_options = {:debug_info => true}
# end

# To enable relative paths to assets via compass helper functions. Uncomment:
# relative_assets = true

line_comments = false
color_output = false

# If you prefer the Sassy-CSS (SCSS) syntax, you might want to regenerate this
# project again passing --syntax scss, or you can change preferred_syntax to ":scss":
preferred_syntax = :sass
# and then run:
# sass-convert -R --from sass --to scss src/sass src/scss && rm -rf src/sass
