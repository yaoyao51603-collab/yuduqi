import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import JSZip from 'jszip'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'public/samples/sample.epub')

const chapters = [
  {
    title: '第一章 纸页之间',
    paragraphs: [
      '城南的旧书店开在一条没有名字的巷子里。木门很矮，进门要低头，门楣上挂着一块褪色的木牌，只刻了两个字：纸间。',
      '店主姓沈，六十岁上下，总穿一件洗得发白的灰布衫。他不招呼客人，也不推荐书，只在柜台后面修书。起脊、补页、换封面，动作很慢，像在给谁缝一件旧衣裳。',
      '我第一次走进去，是因为下雨。檐水顺着瓦当连成一条线，巷子里白茫茫的。我随手从架上抽出一本，封面已经磨掉了，扉页上有人用钢笔写了一行小字：给阿禾，愿你此后有书可读，有路可走。',
      '字迹很旧，墨水洇开了一点。我站在那儿看了很久，忽然觉得这间屋子里的每一本书，都替某个人保管着一小段时间。',
      '沈先生从柜台后抬头，说：喜欢就拿回去看，不急还。我问他，不怕我不还吗。他笑了一下，说，书在谁手里，都是读；怕的是它一直立在架子上，没人翻。',
      '那天我把书带回了家。雨停的时候，巷口的梧桐落了一地叶子，踩上去没有声音。',
    ],
  },
  {
    title: '第二章 旧书不旧',
    paragraphs: [
      '书名叫《河岸手记》，作者是一个我没听过的名字。出版的年份比我的年纪还大，纸已经发黄，边角起了毛。',
      '翻开第一页，是一段关于渡口的描写：天还没亮，船工把缆绳一圈一圈解开，河面上起着一层薄雾，对岸的灯像被水泡过，模模糊糊的。',
      '我读得很慢。不是为了记住什么，只是那些句子有一种奇怪的耐心，像一个人坐在你对面，不急着把话说完。',
      '后来我才发现，书里夹着几张纸。一张是公共汽车的旧票，一张是手写的书目，还有一张半截的信。信上只有一句话：等春天来了，我们就去看海。',
      '我没有把纸片拿出来。它们不属于我。我只是把书合上，放回桌上，忽然理解了沈先生说的那句话：书在谁手里，都是读。',
      '第二天我又去了纸间。沈先生正在给一本书换封面，糨糊的味道很淡。我把书还给他，他看也没看，随手放回架上，说，看完了？我说，看完了。他说，那就再找一本。',
    ],
  },
  {
    title: '第三章 修书的人',
    paragraphs: [
      '沈先生修书的时候不说话。他把书拆开，线一针一针地挑断，摊平，补纸，再缝回去。有时一本书要修上一个星期。',
      '我问他，修一本书多少钱。他说，看情况。有的书值钱，有的书不值钱，但修的时候都一样，不能急。',
      '他说，纸是有脾气的。太干会脆，太潮会霉；糨糊多了会硬，少了会开。你得顺着它。',
      '我坐在旁边看他干活。阳光从窗棂里斜进来，落在他的手背上，能看见很细的汗毛。针穿过纸的声音很轻，像雨落在瓦上。',
      '那天下午，他修完了一本很旧的字典。封皮是深蓝色的，四角磨白了。他把书合上，用手掌压了压，说，好了。',
      '我看着那本字典，忽然想，人这一辈子，能被这样耐心地对待一次，大概也就不算白活。',
      '沈先生抬头看我，像是看穿了我的心思，说，别想那些没用的。书修好了，是要给人读的。',
    ],
  },
  {
    title: '第四章 河岸',
    paragraphs: [
      '春天来的时候，我带着那本《河岸手记》去了一趟河边。',
      '河还是那条河，渡口却已经废了。石阶上长着青苔，拴船的木桩只剩下半截。对岸的灯还在，白天看不见，到了傍晚，一盏一盏亮起来。',
      '我坐在石阶上，把书翻到写渡口的那一页。风从水面上吹过来，纸页哗哗地响。我忽然觉得，那个不知名的作者，也许就坐在我现在坐的地方，看过同样的雾，同样的灯。',
      '书里说，等春天来了，我们就去看海。我不知道他有没有去成。也不知道那半截信是写给谁的。',
      '有些事是没有下文的。可书把它们留住了。留在一个不相关的人手里，被一个不相关的下午翻开，然后又被合上。',
      '回去的路上，我买了两只烧饼。纸间还亮着灯，沈先生坐在门口的小凳上，膝头摊着一本没修完的书。我把烧饼递给他，他愣了一下，接过去，说，还热着。',
      '我说，嗯，还热着。',
    ],
  },
  {
    title: '第五章 纸间',
    paragraphs: [
      '入夏以后，我搬去了城北，去纸间的次数少了。',
      '有一回路过那条巷子，发现木门锁着，门楣上的木牌不见了。隔壁杂货店的老板娘说，沈先生身体不好，回老家了，店盘给了别人，过些日子要改成奶茶店。',
      '我站在门口，看了一会儿。门缝里透出一点光，什么也看不清。',
      '后来我常常想起纸间。想起檐水连成的线，想起糨糊的味道，想起针穿过纸的声音。那间屋子很小，却装得下很多人的很多年。',
      '再后来，我也开始买书、藏书。搬家的时候，书装了十几个箱子，重得搬不动。朋友笑我，说现在谁还看纸书。我说，纸书有纸书的好。',
      '好在哪儿，我说不上来。也许好在它慢。好在你翻过一页，它就记得你翻过；你在某一页停下来，它就替你停在那儿。',
      '有一天我整理旧书，翻出那本《河岸手记》。扉页上那行钢笔字还在：给阿禾，愿你此后有书可读，有路可走。',
      '字迹比记忆里更淡了。我看了很久，把书放回架上。窗外的天正在暗下来，楼下有人喊孩子回家吃饭，声音传上来，模模糊糊的。',
      '我忽然想，纸间也许并没有关门。它只是换了一个地方，开在每一个还愿意翻开书的人手里。',
    ],
  },
]

const escapeXml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const chapterDocument = (chapter) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head><meta charset="utf-8" /><title>${escapeXml(chapter.title)}</title>
<link rel="stylesheet" type="text/css" href="../style.css" /></head>
<body>
<section>
<h2>${escapeXml(chapter.title)}</h2>
${chapter.paragraphs.map((paragraph) => `<p>${escapeXml(paragraph)}</p>`).join('\n')}
</section>
</body>
</html>`

const zip = new JSZip()
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
zip.file(
  'META-INF/container.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`,
)

zip.file(
  'OEBPS/content.opf',
  `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="zh-CN">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:6a1f2f64-8f0c-4d7a-9b7e-43f7a1c2e9d1</dc:identifier>
    <dc:title>纸间</dc:title>
    <dc:creator>佚名</dc:creator>
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="css" href="style.css" media-type="text/css" />
${chapters
  .map(
    (_, index) =>
      `    <item id="chapter-${index + 1}" href="text/chapter-${index + 1}.xhtml" media-type="application/xhtml+xml" />`,
  )
  .join('\n')}
  </manifest>
  <spine toc="ncx">
${chapters.map((_, index) => `    <itemref idref="chapter-${index + 1}" />`).join('\n')}
  </spine>
</package>`,
)

zip.file(
  'OEBPS/nav.xhtml',
  `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">
<head><meta charset="utf-8" /><title>目录</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>目录</h1>
<ol>
${chapters.map((chapter, index) => `<li><a href="text/chapter-${index + 1}.xhtml">${escapeXml(chapter.title)}</a></li>`).join('\n')}
</ol>
</nav>
</body>
</html>`,
)

zip.file(
  'OEBPS/toc.ncx',
  `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:uuid:6a1f2f64-8f0c-4d7a-9b7e-43f7a1c2e9d1" /></head>
<docTitle><text>纸间</text></docTitle>
<navMap>
${chapters
  .map(
    (chapter, index) =>
      `  <navPoint id="nav-${index + 1}" playOrder="${index + 1}"><navLabel><text>${escapeXml(chapter.title)}</text></navLabel><content src="text/chapter-${index + 1}.xhtml" /></navPoint>`,
  )
  .join('\n')}
</navMap>
</ncx>`,
)

zip.file(
  'OEBPS/style.css',
  `body { margin: 0; padding: 0 6%; color: #211e19; background: #fbf9f3; font-family: "Songti SC", "Noto Serif CJK SC", serif; line-height: 1.75; }
h2 { font-size: 1.25em; margin: 1.6em 0 1em; font-weight: 600; }
p { margin: 0 0 0.9em; text-indent: 2em; }
`,
)

chapters.forEach((chapter, index) => {
  zip.file(`OEBPS/text/chapter-${index + 1}.xhtml`, chapterDocument(chapter))
})

const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
await mkdir(dirname(out), { recursive: true })
await writeFile(out, buffer)

const nav = await readFile(out)
console.log(`sample.epub written: ${out} (${nav.length} bytes)`)
