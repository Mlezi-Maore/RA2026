"""Construit l'outil : dist/RA_Mlezi_Maore_outil.html (hors ligne) et apps-script/*.html (web app).
Usage : python3 build.py   (aucune dépendance : les bibliothèques sont dans vendor/)"""
import base64, pathlib, re
R = pathlib.Path(__file__).parent
V = R / 'vendor'
shell = (R / 'src/shell.html').read_text(encoding='utf-8')
app = '\n'.join((R / f'src/{n}.js').read_text(encoding='utf-8') for n in ['core', 'saisie', 'report', 'views', 'drive'])
xlsx = (V / 'xlsx.full.min.js').read_text(encoding='utf-8')
paged = (V / 'paged.polyfill.min.js').read_text(encoding='utf-8')
f4 = base64.b64encode((V / 'open-sans-latin-400-normal.woff2').read_bytes()).decode()
f7 = base64.b64encode((V / 'open-sans-latin-700-normal.woff2').read_bytes()).decode()
safe = lambda s: re.sub(r'</(script)', r'<\\/\1', s, flags=re.I)
base = shell.replace('__FONT400__', f4).replace('__FONT700__', f7)
# 1) version autonome hors ligne
out = base
for k, v in {'__XLSX__': safe(xlsx), '__PAGED__': safe(paged), '__APP__': safe(app)}.items():
    i = out.index(k); out = out[:i] + v + out[i + len(k):]
(R / 'dist').mkdir(exist_ok=True)
(R / 'dist/RA_Mlezi_Maore_outil.html').write_text(out, encoding='utf-8')
# 2) version Apps Script : Index.html inclut les bibliothèques et l'application (fichiers séparés)
AS = R / 'apps-script'
idx = base.replace('<script>__XLSX__</script>', "<?!= include('lib_xlsx') ?>") \
          .replace('<script type="text/plain" id="lib-paged">__PAGED__</script>', "<?!= include('lib_paged') ?>") \
          .replace('<script>\n__APP__\n</script>', "<?!= include('app') ?>")
assert '__XLSX__' not in idx and '__PAGED__' not in idx and '__APP__' not in idx
(AS / 'Index.html').write_text(idx, encoding='utf-8')
(AS / 'lib_xlsx.html').write_text('<script>' + safe(xlsx) + '</script>', encoding='utf-8')
(AS / 'lib_paged.html').write_text('<script type="text/plain" id="lib-paged">' + safe(paged) + '</script>', encoding='utf-8')
(AS / 'app.html').write_text('<script>\n' + safe(app) + '\n</script>', encoding='utf-8')
print('dist/RA_Mlezi_Maore_outil.html et apps-script/ reconstruits')
