# Builds dist/artifact.html: one self-contained page for the claude.ai preview (local demo mode).
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text()
head_css = re.search(r'<style>(.*?)</style>', html, re.S).group(1)
body_markup = '<div class="glow" aria-hidden="true"></div>\n<main id="app"></main>\n<nav class="tabs" id="tabs" aria-label="Main" hidden></nav>\n<div id="toast" role="status" aria-live="polite" hidden></div>\n'
js = ''
for f in ['config.js', 'data.js', 'core.js', 'screens.js', 'main.js']:
    src = (root/f).read_text()
    if f == 'config.js':   # the preview always runs in local demo mode
        src = re.sub(r"SUPABASE_URL: '[^']*'", "SUPABASE_URL: ''", src)
        src = re.sub(r"SUPABASE_ANON_KEY: '[^']*'", "SUPABASE_ANON_KEY: ''", src)
    js += '\n/* ===== ' + f + ' ===== */\n' + src
out = ('<title>Beyond</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;600;700&display=swap">\n'
       '<style>' + head_css + '\nhtml,body{height:auto}\n</style>\n' + body_markup + '<script>' + js + '</script>\n')
(root/'dist').mkdir(exist_ok=True)
(root/'dist'/'artifact.html').write_text(out)
print('dist/artifact.html', len(out), 'bytes')
