import importlib.util, pathlib, unittest, sys
sys.dont_write_bytecode = True
spec=importlib.util.spec_from_file_location('importer',pathlib.Path(__file__).with_name('import_uchitel.py'))
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
class ParserTests(unittest.TestCase):
 def test_both_templates_preserve_math_and_ignore_scripts(self):
  for css in ['entry-content','the_content_wrapper']:
   p=module.Article();p.feed(f'<nav>Noise</nav><div class="{css}"><h2>Формулы</h2><p>x<sup>2</sup> + a<sub>1</sub></p><script>bad()</script><img src="formula.png" alt="формула"/><p>После картинки</p></div><footer>Footer</footer>')
   self.assertIn('x^(2) + a_(1)',p.text());self.assertIn('После картинки',p.text());self.assertNotIn('bad()',p.text());self.assertNotIn('Noise',p.text());self.assertNotIn('Footer',p.text());self.assertEqual(p.headings,['Формулы']);self.assertEqual(len(p.images),1)
 def test_empty_or_changed_template_is_detectable(self):
  p=module.Article();p.feed('<html>Access denied</html>');self.assertEqual(p.text(),'')
if __name__=='__main__':unittest.main()
